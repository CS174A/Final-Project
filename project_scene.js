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
            cube: new defs.Cube(),
            s1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            s4: new defs.Subdivision_Sphere(4),
            text: new Text_Line(30),
            triangle: new defs.Triangle(),
        };
        
        // airplane pieces
        this.plane = {
            cylinder: new defs.Rounded_Capped_Cylinder(200, 200),
            cone: new defs.Rounded_Closed_Cone(30,30),
            blade: new defs.Cube(),
        }

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#b90e0a")}),
            test3: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#e7decc")}),
            test4: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0.5, specularity: 0.5, color: hex_color("#fbd934")}),
            sand: new Material(new defs.Phong_Shader(),
                {ambient: 0.8, diffusivity: 0.5, specularity: 0.5, color: hex_color("#fdee73")}),

        }
        const texture = new defs.Textured_Phong(1);
        this.text_image = new Material(texture, {
            ambient: 1, diffusivity: 0, specularity: 0,
            texture: new Texture("assets/text.png")
        });
        
        //Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
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

        // landscape:
        //this.sun_transform = Mat4.identity();
        this.sun_transform = Mat4.scale(15,15,15).times(Mat4.translation(0,0,-2.5));
        this.sky_transform = Mat4.translation(0,0,-30).times(Mat4.scale(100,100,1))
        this.floor_transform = Mat4.scale(50,1,7).times(Mat4.translation(0, -14, 0));
        this.sand_transform = Mat4.scale(9,3,3).times(Mat4.translation(0,-4.75,-2)).times(Mat4.rotation(Math.PI/2,1,0,1));
        this.sand_transform2 = Mat4.scale(9,3,3).times(Mat4.translation(2,-4.75,-1.5)).times(Mat4.rotation(Math.PI/4,1,1,1));
        this.sand_transform3 = Mat4.scale(9,3,4).times(Mat4.translation(1.7,-4.75,-2)).times(Mat4.rotation(Math.PI/4,1,1,0));

        // air plane body
        this.base_transform = Mat4.rotation(Math.PI/2,0,1,0).times(Mat4.scale(0.45,0.45,1.45));
        this.front_transform = Mat4.rotation(Math.PI/2,0,1,0).times(Mat4.scale(0.45,0.45,0.5));
        this.tip_transform = Mat4.rotation(Math.PI/2,0,1,0).times(Mat4.scale(0.25,0.25,0.25));
        this.blade_transform = Mat4.identity();
        this.wing1_transform = Mat4.rotation(Math.PI/2, 1, 0, 0).times(Mat4.scale(0.5, 1.75, 0.05));
        this.wing2_transform = Mat4.rotation(Math.PI/2, 1, 0, 0).times(Mat4.scale(0.5, 1.5, 0.09));
        this.wing3_transform = Mat4.rotation(Math.PI/2, 1, 0, 0).times(Mat4.scale(0.5, 1.5, 0.09));

        this.backwing1_transform = Mat4.rotation(Math.PI/2, 1, 0, 0).times(Mat4.scale(0.25, 1.2, 0.05));
        this.backwing2_transform = Mat4.rotation(Math.PI/3, 0, 0, 1).times(Mat4.rotation(Math.PI/2, 0, 0, 1).times(Mat4.scale(0.3, 0.2, 0.05)));
        this.backwing3_transform = Mat4.rotation(Math.PI/2, 1, 0, 0).times(Mat4.scale(0.5, 0.75, 0.09));
        
        this.pipe_transform = Mat4.rotation(Math.PI/2,0,1,0).times(Mat4.scale(0.1,0.1,0.5));
        this.back_transform = Mat4.rotation(Math.PI/2,0,1,0).times(Mat4.scale(0.45,0.45,-1.25));


        

 
        
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

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        const light_position = vec4(t, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 500)];

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

        // *** Color constants
        const yellow = hex_color("#fac91a");
        const brightsun = hex_color("#fbd934");
        const green = hex_color("004225"); // grass (or cactus)
        const sand = hex_color("fdee73"); // desert sand
        const skyblue = hex_color("87ceeb");


        // *** TODO: Draw airplane.
        //this.shapes.torus.draw(context, program_state, this.airplane_model_transform, this.materials.test.override({color: yellow}));

        // draw base of plane:
        this.blade_transform = Mat4.identity().times(Mat4.rotation(10*t, 1, 0, 0)
            .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
            .times(Mat4.scale(0.2, 1.25, 0.05)));
        
        let blade_temp = this.blade_transform; 
        console.log(blade_temp);

        //this.blade_transform =  this.blade_transform.times(Mat4.rotation(t/500, 0, 0, 1));

        for (let i = 0; i < 3; i++){
            this.base_transform[i][3] = this.airplane_model_transform[i][3];
            this.front_transform[i][3] = this.airplane_model_transform[i][3];
            this.tip_transform[i][3] = this.airplane_model_transform[i][3];
            this.pipe_transform[i][3] = this.airplane_model_transform[i][3];
            this.back_transform[i][3] = this.airplane_model_transform[i][3];
            this.wing1_transform[i][3] = this.airplane_model_transform[i][3];
            this.wing2_transform[i][3] = this.airplane_model_transform[i][3];
            this.wing3_transform[i][3] = this.airplane_model_transform[i][3];
            this.backwing1_transform[i][3] = this.airplane_model_transform[i][3];
            this.backwing2_transform[i][3] = this.airplane_model_transform[i][3];
            this.backwing3_transform[i][3] = this.airplane_model_transform[i][3];
            blade_temp[i][3] = this.airplane_model_transform[i][3];
        }
        this.tip_transform[0][3] += 1.5;
        this.front_transform[0][3] += 0.7;
        this.pipe_transform[0][3] += 1.2;
        this.back_transform[0][3] -= 1.8;
        this.wing1_transform[1][3] -= 0.25;
        this.wing2_transform[1][3] -= 0.25;
        this.wing2_transform[2][3] += 2;
        this.wing3_transform[1][3] -= 0.25;
        this.wing3_transform[2][3] -= 2;
        this.backwing1_transform[0][3] -= 2.73;
        this.backwing2_transform[0][3] -= 2.8;
        this.backwing2_transform[1][3] += 0.1;
        blade_temp[0][3] += 1.2;


        this.sun_transform[0][3] = t;
        this.sky_transform[0][3] = t
        this.floor_transform[0][3] = t;

        this.plane.cylinder.draw(context, program_state, this.base_transform, this.materials.test2);
        this.plane.cone.draw(context, program_state, this.tip_transform, this.materials.test4);
        this.plane.cylinder.draw(context, program_state, this.front_transform, this.materials.test3);
        this.plane.blade.draw(context, program_state, blade_temp, this.materials.test2);
        this.plane.cylinder.draw(context, program_state, this.pipe_transform, this.materials.test3);
        this.plane.cone.draw(context, program_state, this.back_transform, this.materials.test2);
        this.plane.blade.draw(context, program_state, this.wing1_transform, this.materials.test2);
        this.plane.cylinder.draw(context, program_state, this.wing2_transform, this.materials.test2);
        this.plane.cylinder.draw(context, program_state, this.wing3_transform, this.materials.test2);
        this.plane.cylinder.draw(context, program_state, this.backwing1_transform, this.materials.test2);
        this.plane.cylinder.draw(context, program_state, this.backwing2_transform, this.materials.test2);
        // *** TODO: Draw 3D landscape.

        
        this.shapes.sphere.draw(context, program_state, this.sun_transform, this.materials.sun);
        this.shapes.cube.draw(context, program_state, this.sky_transform, this.materials.sun.override({color: skyblue}));
        this.shapes.cube.draw(context, program_state, this.floor_transform, this.materials.sand);
        this.shapes.s1.draw(context, program_state, this.sand_transform, this.materials.sand);
        this.shapes.s1.draw(context, program_state, this.sand_transform2, this.materials.sand);
        this.shapes.s1.draw(context, program_state, this.sand_transform3, this.materials.sand);

        /* sand terrain generator */
        


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