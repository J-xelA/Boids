// https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection


// Flocking behavior for boids
class Boid{
    constructor(p, v){
        this.p = p; // Position vector
        this.v = v; // Velocity vector
        this.a = createVector(0, 0, 0); // Acceleration vector

        this.maxForce = 0.1; // Maximum steering force for alignment, cohesion, separation
        this.maxSpeed = 5; // Desired velocity for the steering behaviors

        if(color.get('Default'))
            this.R = 50, this.G = 50, this.B = 50;
        if(color.get('Reds'))
            this.R = (random(160, 255)), this.G = 0, this.B = 0;
        if(color.get('Greens'))
            this.R = 0, this.G = floor(random(160, 255)), this.B = 0;
        if(color.get('Blues'))
            this.R = 0, this.G = 0, this.B = floor(random(160, 255));
        if(color.get('Yellows'))
            this.R = floor(random(240, 255)), this.G = floor(random(200, 255)), this.B = 0;
        if(color.get('Cyans'))
            this.R = 0, this.G = floor(random(160, 255)), this.B = floor(random(160, 255));
        if(color.get('Magentas'))
            this.R = floor(random(160, 255)), this.G = 0, this.B = floor(random(160, 255));
        if(color.get('Rainbow'))
            this.R = floor(random(0, 255)), this.G = floor(random(0, 255)), this.B = floor(random(0, 255));
    }//constructor

    // Separation rule
    // Steering to avoid proximity of neighbors
    separation(neighbors){
        let steering = createVector(); // Steering vector
        
        for(let neighbor of neighbors){
            let diff = p5.Vector.sub(this.p, neighbor.p); // Vector from neighbor boid to this boid
            let d = max(neighbor.distance, 0.01); // Distance between neighbor boid and this boid
            steering.add(diff.div(d)); // Magnitude inversely proportional to the distance
        }//for

        if(neighbors.length > 0){
            steering.div(neighbors.length); // Orientation of the desired velocity
            steering.setMag(this.maxSpeed); // Desired velocity
            steering.sub(this.v); // Actual steering
            steering.limit(this.maxForce); // Steering limited to maxForce
        }//if

        return steering;
    }//separation

    // Alignment rules
    // Steering to average neighbors velocity
    alignment(neighbors){
        let steering = createVector(); // Steering vector

        for(let neighbor of neighbors)
            steering.add(neighbor.v); // Sum of neighbor velocities 

        if(neighbors.length > 0){
            steering.div(neighbors.length); // Average neighbors velocity
            steering.setMag(this.maxSpeed); // Desired velocity
            steering.sub(this.v); // Actual steering
            steering.limit(this.maxForce); // Steering limited to maxForce
        }//if

        return steering;
    }//alignment
  
    // Cohesion rule
    // Steering to the average neighbors position
    cohesion(neighbors) {
        let steering = createVector();

        for(let neighbor of neighbors)
            steering.add(neighbor.p); // Sum of neighbor positions

        if(neighbors.length > 0) {
            steering.div(neighbors.length); // Average neighbors position
            steering.sub(this.p); // Orientation of the desired velocity
            steering.setMag(this.maxSpeed); // Desired velocity
            steering.sub(this.v); // Actual steering
            steering.limit(this.maxForce); // Steering limited to maxForce
        }//if

        return steering;
    }//cohesion
  
    // Application of the rules
    flock(boids, quadTree){
        let radius = settings.perception; // Max distance of a neighbor
        let neighbors = [];

        // Make an array of neighbors, i.e. all boids closer than the perception radius
        // The array will be passed to the different flocking behaviors
        let boundary = new Cage(this.p.x, this.p.y, this.p.z, radius, radius, radius);
        let queryNeighbors = quadTree.query(boundary);
        for(let neighbor of queryNeighbors){
            let distance = this.p.dist(neighbor.p);
            if(neighbor != this && distance < radius){
                neighbor.distance = distance; // Record the distance so it can be used later
                neighbors.push(neighbor); // Put this neighbor in the "neighbors" array
            }//if
        }//for

        // Calculate the force of separation and apply it to the boid
        let separation = this.separation(neighbors);
        separation.mult(settings.separation);
        this.a.add(separation);
    
        // Calculate the force of alignments and apply it to the boid
        let alignment = this.alignment(neighbors);
        alignment.mult(settings.alignment);
        this.a.add(alignment);
    
        // Calculate the force of cohesion and apply it to the boid
        if(settings.startCenter){
            if(curFrame > 100){ // No cohesion in the first 100 frames
                let cohesion = this.cohesion(neighbors);
                cohesion.mult(settings.cohesion);
                this.a.add(cohesion);
            }//if
        }//if
    
        // If a boid reaches the edge of its bounding box, applying a steering force to redirect it
        if(this.p.x < -W/2-gap*2 || this.p.x > W/2+gap*2)
            this.a.add(createVector(-this.p.x / W*this.maxForce*15, 0, 0));

        if(this.p.y < -H/2-gap*2 || this.p.y > H/2+gap*2)
            this.a.add(createVector(0, -this.p.y / H*this.maxForce*15, 0));

        if(this.p.z < -D/2-gap*2 || this.p.z > D/2+gap*2)
            this.a.add(createVector(0, 0, -this.p.z / D*this.maxForce*15));

        // If the boid has no neighbor, apply random forces so it can go find other boids
        if(neighbors.length == 0){
            let force = p5.Vector.random3D().mult(this.maxForce/5);
            force.z = 0; // Only go find other in an XY plane
            this.a.add(force);
        }//if
    }//flock
  
    // Update position, velocity, and acceleration
    update(gap){
        // Apply physics
        this.p.add(this.v);
        this.v.add(this.a);
        this.v.mult(1.01); // Friction
        this.v.limit(this.maxSpeed);
        this.a.mult(0);
    }//update
  
    // Display the boid on screen
    display(){
        noStroke();
        fill(255);

        // ambientMaterial(this.R, this.G, this.B);
        specularMaterial(this.R, this.G, this.B);    
        shininess(45);

        push();

        translate(this.p.x, this.p.y, this.p.z);
        sphere(10);
        
        let arrow = createVector(this.v.x, this.v.y, this.v.z).setMag(5);
        translate(arrow.x, arrow.y, arrow.z);
        sphere(9);

        arrow = createVector(this.v.x, this.v.y, this.v.z).setMag(5);
        translate(arrow.x, arrow.y, arrow.z);
        sphere(7);

        pop();
    }//display
}//Boid