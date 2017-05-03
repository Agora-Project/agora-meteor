let SAMPLE_SIZE = 16;
let CELL_CAPACITY = 16;

//K-d tree implementation
let KDCell = function(posts, axis) {
    let self = this;
    
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
    this.isSplit = true;
    
    //Expose methods.
    this.makeMap = function(map) {
        if (left.isSplit) {
            left.makeMap(map);
        }
        else for (let post of left) {
            map[post._id] = left;
        }
        
        if (right.isSplit) {
            right.makeMap(map);
        }
        else for (let post of right) {
            map[post._id] = right;
        }
    };
    
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
    
    let cellInsert = function(cell, map, post) {
        if (cell.isSplit) {
            cell.insert(map, post);
        }
        else {
            cell.push(post);
            map[post._id] = cell;
            if (cell.length > CELL_CAPACITY) {
                cell = new KDCell(cell, nextAxis);
            }
        }
        
        return cell;
    };
    
    this.insert = function(map, post) {
        if (getValue(post) < median) {
            left = cellInsert(left, map, post);
        }
        else {
            right = cellInsert(right, map, post);
        }
    };
};

MainViewPartitioner = function(camera) {
    let self = this;
    let root, map;
    
    this.init = function(postArray) {
        root = new KDCell(postArray, 'X');
        root.makeMap(map = {});
    };
    
    this.addPost = function(post) {
        root.insert(map, post);
    };
    
    this.removePost = function(post) {
        let id = post._id;
        let leaf = map[id];
        if (leaf === undefined) {
            return;
        }
        
        for (let i = 0; i < leaf.length; i++) {
            let p = leaf[i];
            if (p._id == id) {
                leaf.splice(i, 1);
                delete map[id];
                return p;
            }
        }
    };
    
    this.updatePostPosition = function(id, pos) {
        let post = self.removePost({_id: id});
        post.defaultPosition = pos;
        self.addPost(post);
    };
    
    this.getVisible = function() {
        let out = [];
        root.getVisible(camera.getBounds(), out);
        return out;
    };
};
