// 3D Boids (Bird-like Objects)
// Research: http://www.red3d.com/cwr/boids/
// Inspiration: https://youtu.be/mhjuuHl6qHM

/*
  In setup, a flock of boids is created with initial position and velocity
  After 40 frames, boids acquire perception, alignment, cohesion, and separation
  	- Preception: how far a boid can be from another boid to be considered neighbor
    - Alignment: steering behavior of a boid towards the average velocity of its neighbors
    - Cohesion: steering behavior of a boid towards the average location of its neighbors
    - Separation: steering behavior of boid to avoid too much proximity with its closest neighbors
  If a boid fly too high or too low, a force is applied to make it go to the average depth
  	- So that they tend to fly horizontally
  There is also a quad tree to minimize the cost distance calculation
*/

let W = window.innerWidth;
let H = window.innerHeight;

let R = 255, G = 255, B = 255;

let curColor = '';
let previousColor = '';

const color = new Map();
color.set('Default', false);
color.set('Reds', false);
color.set('Greens', false);
color.set('Blues', false);
color.set('Yellows', false);
color.set('Cyans', false);
color.set('Magentas', false);
color.set('Rainbow', false);

const flock = []; // Array of boids
let D = H; // The Z location of the boid tend to stay between +depth/2 and -depth/2
let gap = 50; // Boids can go further than the edges, this further distance is the gap
let quadTree; // A quad tree to minimize the cost of distance calculation

let curFrame = 0; // Counts the frame from the time boids go out of the middle of space

// dat.GUI
let boidSettings = function(){
	this.numBoids    = 200;   // Number of boids

    this.perception  = 125;    // Perception radius for each boid
	
	this.separation  = 1;     // Steer to avoid crowding local flockmates
	this.alignment   = 1;     // Steer towards the average heading of local flockmates
	this.cohesion    = 1;     // Steer towards the average position of local flockmates

	this.options     = 'Default';

	this.startCenter  = true; // Starts each boid in the center of the cage
	this.showQuadTree = false;
	this.pause        = false; // Pause the main loop
}//boidSettings()
let settings = new boidSettings();



function setup(){
	createCanvas(W, H, WEBGL);
	colorMode(RGB);
	camera(0, 0, (H/2)/tan(PI/14), 0, 0, 0, 0, 1, 0);

	color.set('Default', true);

	let gui = new dat.GUI();

	gui.add(settings, 'numBoids', 1, 300);

	var f1 = gui.addFolder('Perception');
	f1.add(settings, 'perception', 0, 500);
	f1.open();

	var f2 = gui.addFolder('Rules');
	f2.add(settings, 'separation', 0, 3);
	f2.add(settings, 'alignment', 0, 3);
	f2.add(settings, 'cohesion', 0, 3);
	f2.open();

	var f3 = gui.addFolder('Options');
	f3.add(settings, 'options',
	['Default', 'Reds', 'Greens', 'Blues', 'Yellows', 'Cyans', 'Magentas', 'Rainbow'])
	.name('Colors')
	.onChange(function(val){
		curColor = val;
		if(val == 'Default')  { color.set('Default', true);  reset(); }
		if(val == 'Reds')     { color.set('Reds', true);     reset(); }
		if(val == 'Greens')   { color.set('Greens', true);   reset(); }
		if(val == 'Blues')    { color.set('Blues', true);    reset(); }
		if(val == 'Yellows')  { color.set('Yellows', true);  reset(); }
		if(val == 'Cyans')    { color.set('Cyans', true);    reset(); }
		if(val == 'Magentas') { color.set('Magentas', true); reset(); }
		if(val == 'Rainbow')  { color.set('Rainbow', true);  reset(); }
		previousColor = val;
	});
	f3.add(settings, 'startCenter');
	f3.add(settings, 'showQuadTree');
	f3.add(settings, 'pause').onChange(function() { pause(); });
	f3.open();

	let obj = { reset: function () { reset(); } }
	gui.add(obj, 'reset');
  
	// Create an initial population of 250 boids
	for(let i = 0; i < settings.numBoids; ++i)
	  	createBoid();

	let camInfo = createDiv('Left-click (Pan/Tilt) || Right-click (Dolly/Truck)');
	camInfo.style('font-size', '18px');
	camInfo.position(W/2-185, H-45);

	console.log("Size of Cube: ", W+250, H+250, D+250);
}//setup()



function draw(){
	curFrame++;
	orbitControl(2, 2, 2);
	
	// Background lighting
	background(135, 205, 235);
	directionalLight(150, 150, 150, 1, 1, 0);
	ambientLight(175);
	
	// Draw the flight zone
	stroke(80);
	strokeWeight(8);
	noFill();
	specularMaterial(0, 255, 255);
	box(W+250, H+250, D+250);

	// Make the quad tree
	let cage = new Cage(0, 0, 0, W+250, H+250, D+250);
	quadTree = new QuadTree(cage, 4); // Boundary cage, 4 points per quadrant
	for(let boid of flock)
	  quadTree.insert(boid);
	
	// Each boid determines its acceleration for the next frame
	for(let boid of flock)
	  boid.flock(flock, quadTree);

	// Each boid updates its position and velocity, and is displayed on screen
	for(let boid of flock){
	  boid.update(gap);
	  boid.display();
	}//for
  
	// Adjust the amount of boids on screen according to the slider value
	let maxBoids = settings.numBoids;
	let difference = flock.length - maxBoids;
	if(difference < 0){
	  for(let i = 0; i < -difference; i++)
	  createBoid(); // Add boids if there are less boids than the slider value
	}//if
	else if(difference > 0){
	  for(let i = 0; i < difference; i++)
		flock.pop(); // Remove boids if there are more boids than the slider value
	}//elif
}//draw()



// Create a new boid
function createBoid(){
	let p = createVector(0, 0, 0); // Create a position vector at the center of the cage
	
	// Assign a random position
	if(!settings.startCenter)
		p = createVector(random(-W/2-250+gap*2+17, W/2+250-gap*2-17),
		                 random(-H/2-250+gap*2+17, H/2+250-gap*2-17),
						 random(-D/2-250+gap*2+17, D/2+250-gap*2-17));
	
	let v = p5.Vector.random3D().mult(random(2, 5)); // Random velocity
	
	let boid = new Boid(p, v); // Create a new boid using given position and velocity
	flock.push(boid); // Add the new boid to the flock
}//createBoid()



function pause(){
	if(settings.pause)
		noLoop();
	else
		loop();	
}//pause()



function reset(){
	// Reset frame counter
	curFrame = 0;

	// Reset previous color
	color.set(previousColor, false);
	
	// Set curColor in case of position swap (center to random)
	color.set(curColor, true);

	// Remove all boids from the flock array
	for(let i = 0; i < settings.numBoids; ++i)
		flock.pop();
  	// Add all boids
  	for(let i = 0; i < settings.numBoids; ++i)
		createBoid();
}//reset()



function keyTyped(){
	if(!settings.pause && key === 'p'){
		settings.pause = true;
		noLoop();
	}//if
	else if(settings.pause && key === 'p'){
		settings.pause = false;
		loop();
	}//elif
}//keyPressed()