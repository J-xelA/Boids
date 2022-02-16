// A cage delimiting the volume of a quad tree
class Cage{
    constructor(x, y, z, w, h, d){
        this.x = x;
        this.y = y;
        this.z = z;
        
        this.w = w;
        this.h = h;
        this.d = d;

        this.xMin = x - w;
        this.xMax = x + w;

        this.yMin = y - h;
        this.yMax = y + h;
        
        this.zMin = z - d;
        this.zMax = z + d;
    }//constructor

    // Checks if a boid is inside the cage
    containing(boid){
        return (this.xMin <= boid.p.x && this.xMax >= boid.p.x) &&
               (this.yMin <= boid.p.y && this.yMax >= boid.p.y) &&
               (this.zMin <= boid.p.z && this.zMax >= boid.p.z);
    }//contains

    // Check if two cubes intersect
    intersects(range){
        return !(range.xMin > this.xMax || range.xMax < this.xMin) ||
                (range.yMin > this.yMax || range.yMax < this.yMin) ||
                (range.zMin > this.zMax || range.zMax < this.zMin);
    }//intersects
}//Cage



// The quad tree stores points in a tree structure
// to minimize the cost of distance calculation
class QuadTree{
    constructor(boundary, capacity){
        this.boundary = boundary; // cube giving the borders of the quad tree
        this.capacity = capacity; // Maximum amount of points that can be stored in the quad tree
        this.boids = []; // Array storing the boids in the quad tree
        this.divided = false; // True when the quad tree subdivides
    }//constructor

    // Insert a boid into the quad tree
    insert(boid){
        // Return if the boid is not in the area of this layer of quad tree
        if(!this.boundary.containing(boid))
            return false;

        // Add the boid at this layer or a deeper layer depending on capacity
        if(this.boids.length < this.capacity){
            // Add the point to this layer if there is still room for it
            this.boids.push(boid);
            return true;
        }//if 
        else{
            // Otherwise, subdivide to make room for the new boid
            // Subdivision divides the quad tree area into 8 new children quad trees
            if(!this.divided)
                this.subdivide();

            // Add the boid to the relevant subdivision
            // NW = Northwest, NE = Northeast, SW = Southwest, SE = Southeast, T = Top, B = Bottom
            if(this.NWT.insert(boid))
                return true;
            else if(this.NET.insert(boid))
                return true;
            else if(this.SWT.insert(boid))
                return true;
            else if(this.SET.insert(boid))
                return true;
            else if(this.NWB.insert(boid))
                return true;
            else if(this.NEB.insert(boid))
                return true;
            else if(this.SWB.insert(boid))
                return true;
            else if(this.SEB.insert(boid))
                return true;
        }//else
    }//insert

    // Subdivides the quad tree if it is at full capacity, creating 8 new children quad trees
    subdivide(){
        stroke(125);
        this.divided = true; // Informs of the subdivision to only subdivide once

        let x = this.boundary.x;
        let y = this.boundary.y;
        let z = this.boundary.z;

        let w = this.boundary.w / 2;
        let h = this.boundary.h / 2;
        let d = this.boundary.d / 2;

        if(settings.showQuadTree == true){
            translate(x/2, y/2, z/2);
            box(x, y, z);
            translate(-(x/2), -(y/2), -(z/2));
        }//if

        // Creates the 8 children quad trees with the relevant positions and area
        // North West Top quad tree
        let NWTBoundary = new Cage(x - w, y - h, z - d, w, h, d);
        this.NWT = new QuadTree(NWTBoundary, this.capacity);

        // North East Top quad tree
        let NETBoundary = new Cage(x + w, y - h, z - d, w, h, d);
        this.NET = new QuadTree(NETBoundary, this.capacity);

        // South East Top quad tree
        let SETBoundary = new Cage(x + w, y + h, z - d, w, h, d);
        this.SET = new QuadTree(SETBoundary, this.capacity);

        // South West Top quad tree
        let SWTBoundary = new Cage(x - w, y + h, z - d, w, h, d);
        this.SWT = new QuadTree(SWTBoundary, this.capacity);
        
        // North West Bottom quad tree
        let NWBBoundary = new Cage(x - w, y - h, z + d, w, h, d);
        this.NWB = new QuadTree(NWBBoundary, this.capacity);

        // North East Bottom quad tree
        let NEBBoundary = new Cage(x + w, y - h, z + d, w, h, d);
        this.NEB = new QuadTree(NEBBoundary, this.capacity);

        // South East Bottom quad tree
        let SEBBoundary = new Cage(x + w, y + h, z + d, w, h, d);
        this.SEB = new QuadTree(SEBBoundary, this.capacity);

        // South West Bottom quad tree
        let SWBBoundary = new Cage(x - w, y + h, z + d, w, h, d);
        this.SWB = new QuadTree(SWBBoundary, this.capacity);
    }//subdivide

    // Returns all the points in a given boundary (Cage) and put them in the "found" array
    query(boundary, found){
        // The array "found" will check all quad trees intersecting with the boundary,
        // looking for points intersecting with the boundary
        if(!found)
            found = []; // Creates the array at the beginning of the recursion
        if(!this.boundary.intersects(boundary))
            return found; // No intersection between the quad tree and the boundary, no need to check for points
        else{
            // If the boundary intersects this quad tree, check for the intersection of its points with the boundary
            for(let boid of this.boids){
                if(boundary.containing(boid))
                    found.push(boid); // Add the points intersecting with the boundary to "found"
            }//for

            // This quad tree intersects with the boundary, now do the same for its children quad trees
            if(this.divided){
                this.NWT.query(boundary, found);
                this.NET.query(boundary, found);
                this.SET.query(boundary, found);
                this.SWT.query(boundary, found);
                this.NWB.query(boundary, found);
                this.NEB.query(boundary, found);
                this.SEB.query(boundary, found);
                this.SWB.query(boundary, found);
            }//if
        }//else
        return found;
    }//query
}//QuadTree