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
        // Depends on context:
        this.viewport_height = 0;
        this.viewport_width = 0;

        // Viewport extremes
        this.viewport_top = 10.5;
        this.viewport_bottom = -15;

        // airplane_model_transform ± (viewport_width / 2)
        this.viewport_right = 0;
        this.viewport_left = 0;

        // *** Airplane position
        this.airplane_model_transform = Mat4.identity();

        // *** Control Panel toggles
        this.fly_higher = 0;
        this.debug_logs = 0;
        this.start_game = 0;
        this.is_game_over = 0;
        this.first_start = 1;
        this.restart = 0;

        // *** Cloud storage
        this.cloud_and_pos_array = []
        this.cloud_creation_id = [];
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Start", ["s"], () => {
            this.start_game = 1;
            if (this.is_game_over) {
                this.restart_game()
            }
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
        this.airplane_model_transform = Mat4.identity();
        this.start_game = 1;
        this.is_game_over = 0;
        this.first_start = 0; // redundant.
        this.restart = 1;
        this.cloud_and_pos_array.length = 0;
        clearInterval(this.cloud_creation_id);
    }

    game_over(context, program_state) {
        // Translate everything to 0 on the y-axis
        const y_translation = this.airplane_model_transform[1][3];
        let text_model_transform = this.airplane_model_transform
            .times(Mat4.translation(-15, - y_translation, -5));
        this.print_string(context, program_state, text_model_transform, "Game Over :(")
        text_model_transform = text_model_transform
            .times(Mat4.translation(-1, -3 , 0));
        this.print_string(context, program_state, text_model_transform, "Press [s] to start over")

        this.is_game_over = 1;
        this.start_game = 0;
        this.first_start = 0; // redundant.
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

        // TODO: move light source to follow the plane and camera.
        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");

        // *** Draw below *** //

        // If the game is starting for the first time ever.
        if (!this.start_game) {
            if (this.first_start) {
                let text_model_transform = this.airplane_model_transform
                    .times(Mat4.translation(-12.5, 0, -5));
                this.print_string(context, program_state, text_model_transform, "Press [s] to Start");
                text_model_transform = text_model_transform
                    .times(Mat4.translation(0, -3, 0));
                this.print_string(context, program_state, text_model_transform, "Press [f] to Fly")
            }
            if (this.is_game_over) {
                this.game_over(context, program_state);
            }
            return;
        }

        // Viewport width calculations:
        const aspect_ratio = context.width / context.height;
        this.viewport_height = 10.5 - - 15;
        this.viewport_width = aspect_ratio * this.viewport_height; // 1080 / 600 * 25.5 = 45.9

        // Keep moving camera sideways.
        let new_camera_location = Mat4.inverse(this.initial_camera_location);
        new_camera_location = new_camera_location
            .times(Mat4.translation(t, 0, 0)); // this is always a brand-new translation by t.
        new_camera_location = Mat4.inverse(new_camera_location);
        program_state.set_camera(new_camera_location);

        // *** Create clouds

        // Float in one new cloud every 2 seconds from a random position on the y-axis.
        // Store the creation function inside the constructor so that the clouds persist across frames.
        if (this.first_start || this.restart) {
            this.cloud_creation_id = setInterval(() => {
                // Compute the starting point of cloud and by how many units to drift left.
                const cloud = new defs.Torus(15, 15);
                const x_translation = this.airplane_model_transform[0][3] + this.viewport_width / 2;
                const y_translation = Math.random() * (Math.floor(4) - Math.ceil(-12) + 1) + Math.ceil(-8);

                // Store the info in the array.
                this.cloud_and_pos_array.push({cloud, x_translation, y_translation});
            }, 2000);
            this.first_start = 0;
            this.restart = 0;
        }

        // *** TODO: Draw airplane.
        this.shapes.torus.draw(context, program_state, this.airplane_model_transform, this.materials.test.override({color: yellow}));

        // *** TODO: Draw 3D landscape.

        // *** Control the airplane.

        let previous_translation_x =  this.airplane_model_transform[0][3]; // t is applied on top of an existing, cumulative translation of t.
        if (this.fly_higher) {
            this.airplane_model_transform = this.airplane_model_transform
                .times(Mat4.translation(t - previous_translation_x, 0.8, 0));
            this.fly_higher ^= 1;
        } else {
            this.airplane_model_transform = this.airplane_model_transform
                .times(Mat4.translation(t - previous_translation_x, - 0.04, 0))
        }

        // *** Draw clouds

        for (let cloud_and_pos of this.cloud_and_pos_array) {
            // Calculate and store new translation to drift cloud smoothly to the left.
            cloud_and_pos.x_translation = cloud_and_pos.x_translation - 0.05;

            let cloud_model_transform = Mat4.identity();
            cloud_model_transform = cloud_model_transform
                .times(Mat4.translation(cloud_and_pos.x_translation, cloud_and_pos.y_translation, 0));

            cloud_and_pos.cloud.draw(context, program_state, cloud_model_transform, this.materials.test.override({color: yellow}))
        }

        // *** Delete invisible clouds

        // Calculate left extreme.
        this.viewport_left = this.airplane_model_transform[0][3] - this.viewport_width / 2;

        // (More a collision radius than anything else.)
        let cloud_radius = 0.75; // Adjust after implementing Cloud.

        // Only keep clouds that are still within the viewport.
        this.cloud_and_pos_array = this.cloud_and_pos_array.filter((cloud_and_pos) => {
            return ((cloud_and_pos.x_translation + cloud_radius) > this.viewport_left);
        })

        // *** End game if airplane leaves viewport

        // (Also a collision radius.)
        // Calculate horizontal airplane extremes := airplane_model_transform ± airplane_radius
        let airplane_radius = 0.75; // Adjust after implementing Airplane.

        let airplane_top = this.airplane_model_transform[1][3] + airplane_radius;
        let airplane_bottom = this.airplane_model_transform[1][3] - airplane_radius;

        // Check if airplane goes above or below viewport extremes.
        if (airplane_top >= this.viewport_top || airplane_bottom <= this.viewport_bottom) {
            this.game_over(context, program_state);
        }

        // *** Detect airplane-cloud collisions.

        // Calculate vertical airplane extremes.
        let airplane_left = this.airplane_model_transform[0][3] - airplane_radius;
        let airplane_right = this.airplane_model_transform[0][3] + airplane_radius;

        for (let cloud_and_pos of this.cloud_and_pos_array) {
            let cloud_right = cloud_and_pos.x_translation + cloud_radius;
            let cloud_left = cloud_and_pos.x_translation - cloud_radius;
            let cloud_top = cloud_and_pos.y_translation + cloud_radius;
            let cloud_bottom = cloud_and_pos.y_translation - cloud_radius;

            let flag1 = ((airplane_right > cloud_left) && (cloud_right > airplane_left)) ? 1 : 0;
            let flag2 = ((airplane_top > cloud_bottom) && (cloud_top > airplane_bottom)) ? 1 : 0;

            if (flag1 && flag2) {
                this.game_over(context, program_state);
            }
        }

        // *** Debug helper

        if (this.debug_logs) {
            // console.log("top_airplane:", top_airplane, "bottom_airplane:", bottom_airplane)
            // console.log("left_airplane:", left_airplane, "right_airplane:", right_airplane);
            // console.log("viewport width:", this.viewport_width);
            console.log("cloud_and_pos_array.length:", this.cloud_and_pos_array.length);
            this.debug_logs ^= 1;
        }

    }
}