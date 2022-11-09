import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;
import {Text_Line} from "./examples/text-demo.js";

export class Project_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // *** Shapes
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 40), // columns = edges
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            s1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            s4: new defs.Subdivision_Sphere(4),
            text: new Text_Line(30)
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        }
        const texture = new defs.Textured_Phong(1);
        this.text_image = new Material(texture, {
            ambient: 1, diffusivity: 0, specularity: 0,
            texture: new Texture("assets/text.png")
        });

        // *** Camera
        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        // *** Airplane position
        this.airplane_model_transform = Mat4.identity();

        // *** Control Panel toggles
        this.fly_higher = 0;
        this.debug_logs = 0;
        this.start_game = 0;
        this.is_game_over = 0;

        // *** Text helpers
        this.top_death = 0;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Start", ["s"], () => {
            this.start_game = 1;
        });
        this.key_triggered_button("Fly higher", ["f"], () => {
            this.fly_higher ^= 1;
        });
        this.new_line();
        this.key_triggered_button("Debug logs", ["d"], () => {
            this.debug_logs ^= 1;
        });
    }

    print_string(context, program_state, text_model_transform, line) {
        this.shapes.text.set_string(line, context.context);
        this.shapes.text.draw(context, program_state, text_model_transform, this.text_image);
    }

    restart_game() {

    }

    game_over(context, program_state) {
        if (this.top_death) {
            let text_model_transform = this.airplane_model_transform
                .times(Mat4.translation(-15, -8, -5));
            this.print_string(context, program_state, text_model_transform, "Game Over :(")
            text_model_transform = text_model_transform
                .times(Mat4.translation(-1, -3 , 0));
            this.print_string(context, program_state, text_model_transform, "Press [s] to start over")
        } else {
            let text_model_transform = this.airplane_model_transform
                .times(Mat4.translation(-15, 8 + 3, -5));
            this.print_string(context, program_state, text_model_transform, "Game Over :(")
            text_model_transform = text_model_transform
                .times(Mat4.translation(-1, -3, 0));
            this.print_string(context, program_state, text_model_transform, "Press [s] to start over")
        }

        this.is_game_over = 1;
        this.start_game = 0;
    }

    display(context, program_state) {
        // *** Setup *** //

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");

        // *** Draw below *** //

        // If the game hasn't started and isn't over already
        if (!this.start_game) {
            if (!this.is_game_over) {
                let text_model_transform = this.airplane_model_transform
                    .times(Mat4.translation(-12.5, 0, -5));
                this.print_string(context, program_state, text_model_transform, "Press [s] to Start");
                text_model_transform = text_model_transform
                    .times(Mat4.translation(0, -3, 0));
                this.print_string(context, program_state, text_model_transform, "Press [f] to Fly")
            } else {
                this.game_over(context, program_state)
            }
            return;
        }


        // *** TODO: Draw airplane.
        // (Maybe shadows later)
        this.shapes.torus.draw(context, program_state, this.airplane_model_transform, this.materials.test.override({color: yellow}));

        // *** TODO: Draw 3D landscape.

        // Keep moving camera sideways.
        let new_camera_location = Mat4.inverse(this.initial_camera_location);
        new_camera_location = new_camera_location
            .times(Mat4.translation(t, 0, 0)); // this is always a brand new translation by t.
        new_camera_location = Mat4.inverse(new_camera_location);
        program_state.set_camera(new_camera_location);

        // *** Control the airplane.
        let previous_translation_x =  this.airplane_model_transform[0][3]; // t is applied on top of an existing, cumulative translation of ex t.
        if (this.fly_higher) {
            this.airplane_model_transform = this.airplane_model_transform
                .times(Mat4.translation(t - previous_translation_x, 0.8, 0));
            this.fly_higher ^= 1;
        } else {
            this.airplane_model_transform = this.airplane_model_transform
                .times(Mat4.translation(t - previous_translation_x, - 0.04, 0))
        }

        // *** TODO: Draw persisting clouds that drift left per frame.
        // (Also power ups later)

        // *** TODO: Detect collisions with clouds and top and bottom of screen.
        //  https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection
        let size = 3; // Adjust after implementing airplane.

        // Get max left, right, top, bottom positions of airplane := model_transform ± size
        let left_airplane = this.airplane_model_transform[0][3] + size;
        let right_airplane = this.airplane_model_transform[0][3] - size;
        let top_airplane = this.airplane_model_transform[1][3] + size;
        let bottom_airplane = this.airplane_model_transform[1][3] - size;

        // Check if airplane leaves viewport.
        if (top_airplane >= 10.5 || bottom_airplane <= -15) {
            if (top_airplane >= 10.5) { // ran into top of viewport.
                this.top_death = 1;
            }
            this.game_over(context, program_state);
        }

        // plane.right > cloud.left && cloud.right > plane.left
        // plane.top > cloud.bottom && cloud.top > plane.bottom


        // Add any variables you want to log in here.
        if (this.debug_logs) {
            console.log("top_airplane", top_airplane)
            console.log("bottom_airplane", bottom_airplane)
            this.debug_logs ^= 1;
        }

    }
}