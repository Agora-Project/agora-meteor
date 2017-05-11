MainViewCamera = function() {
    let self = this;
    let canvas;

    let p, scale;
    let postBounds = {left: 0.0, right: 0.0, bottom: 0.0, top: 0.0};
    let MAX_ZOOM = 768.0, minZoom = 0.0;

    let onZoomCallbacks = [];

    this.construct = function(initCanvas) {
        canvas = initCanvas;
    };

    this.zoomPercentage = function() {
        return (scale - minZoom)/(MAX_ZOOM - minZoom);
    };

    this.zoomToPercentage = function(percentage) {
        this.setScale(percentage * (MAX_ZOOM - minZoom) + minZoom);
    };

    this.init = function(postArray) {
        //Calculate post bounds.
        for (let post of postArray) {
            self.addPost(post);
        }

        //Grab session camera state if it exists.
        let state = Session.get('camera');
        if (state) {
            p = state.p;
            scale = state.scale;
        }
        else {
            p = {
                x: (postBounds.left + postBounds.right)*0.5,
                y: (postBounds.bottom + postBounds.top)*0.5
            };
            scale = minZoom;
        }
    };

    this.setScale = function(newScale) {
        if (scale === newScale) return;
        else {
            scale = newScale;
            for (callback of onZoomCallbacks) {
                callback(this);
            }
        }
    };

    this.addPost = function(post) {
        let pos = post.defaultPosition;
        postBounds.left = Math.min(postBounds.left, pos.x);
        postBounds.right = Math.max(postBounds.right, pos.x);
        postBounds.bottom = Math.min(postBounds.bottom, pos.y);
        postBounds.top = Math.max(postBounds.top, pos.y);
    };

    this.removePost = function(post) {
        //Don't need to do anything here; it's okay if bounds never shrink.
    };

    this.updatePost = function(id, fields) {
        if (fields.defaultPosition) {
            self.addPost(fields);
        }
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
        let w = 2.0*scale/canvas[0].width;
        let h = 2.0*scale/canvas[0].height;
        return [w, 0.0, -w*p.x,
                0.0, h, -h*p.y,
                0.0, 0.0, 1.0];
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

        if (targetScale*factor >= MAX_ZOOM) factor = MAX_ZOOM/targetScale;
        else if (targetScale*factor <= minZoom) factor = minZoom/targetScale;

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
            self.setScale(scale * Math.pow(factor, sdt/time));
            let newPos = self.toWorld(mp0);
            p.x += oldPos.x - newPos.x;
            p.y += oldPos.y - newPos.y;
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
        //Calculate min zoom to ensure all posts fit.
        let mzx = canvas[0].width*0.75/(postBounds.right - postBounds.left);
        let mzy = canvas[0].height*0.75/(postBounds.top - postBounds.bottom);
        minZoom = Math.min(mzx, mzy);
        if (!isFinite(minZoom) || minZoom > 128.0) {
            minZoom = 128.0;
        }

        //Clamp camera zoom.
        this.setScale(Math.max(minZoom, Math.min(scale, MAX_ZOOM)));

        //Perform zooming.
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

        //Clamp camera to post bounds.
        let w = 0.375*canvas[0].width/scale;
        let h = 0.375*canvas[0].height/scale;

        p.x = Math.max(p.x, postBounds.left - w);
        p.x = Math.min(p.x, postBounds.right + w);
        p.y = Math.max(p.y, postBounds.bottom - h);
        p.y = Math.min(p.y, postBounds.top + h);

        //Set camera session state.
        Session.set('camera', {p: p, scale: scale});
    };

    this.onZoom = function(callback) {
        onZoomCallbacks.push(callback);
    }
};
