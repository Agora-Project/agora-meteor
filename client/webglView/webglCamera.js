Camera = function(canvas) {
    let p = {x:0.0, y:0.0};
    let scale = 16.0;
    
    let matrix = null;
    let matrixDirty = true;
    
    this.resize = function() {
        matrixDirty = true;
    };
    
    this.isMatrixDirty = function() {
        return matrixDirty;
    };
    
    this.getMatrix = function() {
        if (matrixDirty) {
            let w = 2.0*scale/canvas[0].width;
            let h = 2.0*scale/canvas[0].height;
            matrix = [w, 0.0, -w*p.x,
                      0.0, h, -h*p.y,
                      0.0, 0.0, 1.0];
            matrixDirty = false;
        }
        return matrix;
    };
    
    this.toWorld = function(v) {
        return {x:(v.x - canvas[0].width/2.0)/scale + p.x,
                y:(canvas[0].height/2.0 - v.y)/scale + p.y};
    };
    
    this.toScreen = function(v) {
        return {x:(v.x - p.x)*scale + canvas[0].width/2.0,
                y:(p.y - v.y)*scale + canvas[0].height/2.0};
    };
    
    let mp0 = null;
    let dragging = false;
    
    this.mouseDown = function(mp) {
        mp0 = mp;
        dragging = true;
    };
    
    this.mouseMove = function(mp) {
        if (dragging) {
            p.x += (mp0.x - mp.x)/scale;
            p.y += (mp.y - mp0.y)/scale;
            matrixDirty = true;
        }
        
        mp0 = mp;
    };
    
    this.mouseUp = function(mp) {
        if (dragging) {
            //Clamp position to edges of screen.
            mp.x = Math.max(0, Math.min(mp.x, canvas[0].width));
            mp.y = Math.max(0, Math.min(mp.y, canvas[0].height));
            this.mouseMove(mp);
            dragging = false;
        }
    };
    
    this.mouseWheel = function(deltaY) {
        let oldPos = this.toWorld(mp0);
        scale *= Math.pow(0.9, deltaY);
        let newPos = this.toWorld(mp0);
        p.x += oldPos.x - newPos.x;
        p.y += oldPos.y - newPos.y;
        matrixDirty = true;
    };
};
