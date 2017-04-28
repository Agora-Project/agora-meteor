MainViewCamera = function() {
    let self = this;
    let canvas;
    
    let p = {x:0.0, y:0.0};
    let scale = 16.0;
    
    let matrix = null;
    let matrixDirty = true; //Whether the matrix needs to be updated.
    let matrixChanged = true; //Whether matrix has changed since last frame.
    
    this.init = function(initCanvas) {
        canvas = initCanvas;
    };
    
    this.resize = function() {
        matrixDirty = true;
    };
    
    this.hasChanged = function() {
        return matrixChanged;
    };
    
    this.getPos = function() {
        return {x:p.x, y:p.y};
    };
    
    this.getScale = function() {
        return scale;
    };
    
    this.getBounds = function() {
        let w = 0.5*canvas[0].width/scale;
        let h = 0.5*canvas[0].height/scale;
        let out = {left: p.x - w, right: p.x + w, bottom: p.y - h, top: p.y + h};
        out.contains = function(v) {
            return v.x > out.left && v.x < out.right && v.y > out.bottom && v.y < out.top;
        };
        return out;
    };
    
    this.isPointVisible = function(v) {
        return self.getBounds().contains(v);
    };
    
    this.getMatrix = function() {
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
    
    this.mouseDown = function(mp, button) {
        if (button === 0) {
            mp0 = mp;
            dragging = true;
        }
    };
    
    this.mouseMove = function(mp) {
        if (dragging) {
            p.x += (mp0.x - mp.x)/scale;
            p.y += (mp.y - mp0.y)/scale;
            matrixDirty = true;
        }
        
        mp0 = mp;
    };
    
    this.mouseUp = function(mp, button) {
        if (button === 0 && dragging) {
            //Clamp position to edges of screen.
            mp.x = Math.max(0, Math.min(mp.x, canvas[0].width));
            mp.y = Math.max(0, Math.min(mp.y, canvas[0].height));
            this.mouseMove(mp);
            dragging = false;
        }
    };
    
    this.isDragging = function() {
        return dragging;
    };
    
    let zooms = [];
    let targetScale = scale;
    
    let SmoothZoom = function(factor, time) {
        let t = 0.0, st = 0.0;
        let finished = false;
        
        let MAX_ZOOM = 768.0, MIN_ZOOM = 0.25;
        
        if (targetScale*factor >= MAX_ZOOM) factor = MAX_ZOOM/targetScale;
        else if (targetScale*factor <= MIN_ZOOM) factor = MIN_ZOOM/targetScale;
        
        if (factor == 1.0) finished = true;
        targetScale *= factor;
        
        this.step = function(dt) {
            if (t + dt >= time) {
                dt = time - t;
                finished = true;
            }
            
            let st0 = st;
            t += dt;
            st = (1.0 - Math.cos(t*Math.PI/time))*time/2.0;
            let sdt = st - st0;
            
            let oldPos = self.toWorld(mp0);
            scale *= Math.pow(factor, sdt/time);
            let newPos = self.toWorld(mp0);
            p.x += oldPos.x - newPos.x;
            p.y += oldPos.y - newPos.y;
            matrixDirty = true;
        };
        
        this.isFinished = function() {
            return finished;
        };
    };
    
    this.mouseWheel = function(deltaY) {
        let factor = Math.pow(0.9, deltaY);
        zooms.push(new SmoothZoom(factor, 0.25));
    };
    
    this.step = function(dt) {
        for (let i = zooms.length - 1; i >= 0; i--) {
            let zoom = zooms[i];
            
            zoom.step(dt);
            
            if (zoom.isFinished()) {
                zooms.splice(i, 1);
            }
        }
        
        if (zooms.length === 0) {
            targetScale = scale;
        }
        
        matrixChanged = matrixDirty;
        matrixDirty = false;
        
        if (matrixChanged) {
            let w = 2.0*scale/canvas[0].width;
            let h = 2.0*scale/canvas[0].height;
            matrix = [w, 0.0, -w*p.x,
                      0.0, h, -h*p.y,
                      0.0, 0.0, 1.0];
        }
    };
};
