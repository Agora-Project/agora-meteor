let SAMPLE_SIZE = 16;
let CELL_CAPACITY = 16;

//K-d tree implementation
let KDCell = function(posts, axis) {
    //The given axis is normal to the splitting hyperplane. (Which is a line in this case.)
    let getValue, nextAxis;
    switch(axis) {
        case 'X':
            getValue = function(post) {
                return post.defaultPosition.x;
            };
            nextAxis = 'Y';
            break;
        case 'Y':
            getValue = function(post) {
                return post.defaultPosition.y;
            };
            nextAxis = 'X';
            break;
    }
    
    //Select 16 different random posts to use as a sample.
    let sample;
    if (posts.length <= 16) {
        sample = posts;
    }
    else {
        sample = [];
        let bucketSize = posts.length/SAMPLE_SIZE;
        
        for (let i=0; i<SAMPLE_SIZE; i++) {
            let left = Math.floor(bucketSize*i);
            let right = Math.floor(bucketSize*(i + 1));
            let index = Math.floor(left + (right - left)*Math.random());
            sample.push(posts[index]);
        }
    }
    
    //Find median position of sample.
    sample.sort(function(a, b) {
        return getValue(a) - getValue(b);
    });
    
    let medianIndex = (sample.length - 1)/2; //Sample size may be less than 16.
    
    let median;
    if (Number.isInteger(medianIndex)) {
        median = getValue(sample[medianIndex]);
    }
    else {
        median = (getValue(sample[Math.floor(medianIndex)]) +
                  getValue(sample[Math.ceil(medianIndex)]))*0.5;
    }
    
    //Split into new cells. Left/right means bottom/top if the axis is Y.
    let left = [];
    let right = [];
    
    for (let post of posts) {
        let cell = getValue(post) < median ? left : right;
        cell.push(post);
    }
    
    //Split further if required.
    if (left.length > CELL_CAPACITY) {
        left = new KDCell(left, nextAxis);
    }
    
    if (right.length > CELL_CAPACITY) {
        right = new KDCell(right, nextAxis);
    }
    
    //Expose fields.
    this.left = left;
    this.right = right;
    this.axis = axis;
    this.median = median;
    this.isSplit = true;
    
    //Expose methods.
    this.getVisible = function(bounds, out) {
        let min, max;
        switch(axis) {
            case 'X': min = bounds.left; max = bounds.right; break;
            case 'Y': min = bounds.bottom; max = bounds.top; break;
        }
        
        if (min < median) {
            if (left.isSplit) {
                left.getVisible(bounds, out);
            }
            else for (let post of left) {
                if (bounds.contains(post.defaultPosition)) {
                    out.push(post);
                }
            }
        }
        
        if (max > median) {
            if (right.isSplit) {
                right.getVisible(bounds, out);
            }
            else for (let post of right) {
                if (bounds.contains(post.defaultPosition)) {
                    out.push(post);
                }
            }
        }
    };
};

MainViewPartitioner = function(camera) {
    let root;
    
    this.init = function(postArray) {
        root = new KDCell(postArray, 'X');
    };
    
    this.addPost = function(post) {
    };
    
    this.removePost = function(post) {
    };
    
    this.updatePostPosition = function(id, pos) {
    };
    
    this.getVisible = function() {
        let out = [];
        root.getVisible(camera.getBounds(), out);
        return out;
    };
};
