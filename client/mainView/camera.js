MainViewCamera = function() {
    let self = this;
    let canvas;

    let p, scale;
    let postBounds = {left: 0.0, right: 0.0, bottom: 0.0, top: 0.0};
    let MAX_ZOOM = 768.0, minZoom = 0.0;

    let maxReplies = 0;
    let maxSubtreeWidth = 0;

    let onZoomCallbacks = [];

    this.construct = function(initCanvas) {
        canvas = initCanvas;
    };

    this.init = function(postArray) {
        //Calculate post bounds.
        for (let post of postArray) {
            self.addPost(post);
            if (post.replies.length > maxReplies)
                maxReplies = post.replies.length;
            if (post.subtreeWidth > maxSubtreeWidth)
                maxSubtreeWidth = post.subtreeWidth;
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

            if (scale > MAX_ZOOM) scale = MAX_ZOOM;
            else if (scale < minZoom) scale = minZoom;

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

        if (post.replies && post.replies.length > maxReplies)
            maxReplies = post.replies.length;
        if (post.subtreeWidth > maxSubtreeWidth)
            maxSubtreeWidth = post.subtreeWidth;
    };

    this.removePost = function(post) {
        //Don't need to do anything here; it's okay if bounds never shrink.
    };

    this.updatePost = function(id, fields) {
        if (fields.defaultPosition) {
            self.addPost(fields);
        }
    };

    this.getMaxReplies = function() {
        return maxReplies;
    };

    this.getMaxSubtreeWidth = function() {
        return maxSubtreeWidth;
    };

    this.getPos = function() {
        return {x:p.x, y:p.y};
    };

    this.getScale = function() {
        return scale;
    };

    this.getZoomFraction = function() {
        let ret = Math.log(scale/minZoom)/Math.log(MAX_ZOOM/minZoom);
        if (ret > 1) ret = 1;
        if (ret < 0) ret = 0;
        return ret;
    };

    this.setZoomFraction = function(fraction) {
        this.setScale(minZoom*Math.pow(MAX_ZOOM/minZoom, fraction));
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

    this.goToPos = function(v) {
        this.setScale(MAX_ZOOM);
        p = v;
    }

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

    let touchDistance = null;
    let prevTouches = [];

    /**
     * Bugs to fix with the mobile touch code:
     *
     *   On Android 7.1.2, Chrome:
     *      * Zooming causes the entire page to zoom in at the same time as the camera, including the MDL header.
     *
     */
    this.touchStart = function(touches) {
        if (touches.length == 1) {
            var mousepos = {
                x: touches[0].x,
                y: touches[0].y
            };
            this.mouseDown(mousepos, 0);
        } else if (touches.length > 1) {
            let t1 = touches[0], t2 = touches[1];
            let xDist = t2.x - t1.x, yDist = t2.y - t1.y;
            touchDistance = Math.sqrt((xDist*xDist) + (yDist*yDist));

            let zoomX, zoomY;

            zoomX = t1.x + (t2.x - t1.x)/2;
            zoomY = t1.y + (t2.y - t1.y)/2;

            var mousepos = {
                x: zoomX,
                y: zoomY
            };
            this.mouseDown(mousepos, 0);
        }
        prevTouches = touches;
    };

    this.touchMove = function(touches) {
        if (touches.length == 1) {
            var mousepos = {
                x: touches[0].x,
                y: touches[0].y
            };
            this.mouseMove(mousepos);

        } else if (touches.length > 1) {
            let t1 = touches[0], t2 = touches[1];
            let xDist = t2.x - t1.x, yDist = t2.y - t1.y;
            let newTouchDistance = Math.sqrt((xDist*xDist) + (yDist*yDist));

            let zoomX, zoomY;

            zoomX = t1.x + (t2.x - t1.x)/2;
            zoomY = t1.y + (t2.y - t1.y)/2;

            var mousepos = {
                x: zoomX,
                y: zoomY
            };
            this.mouseMove(mousepos);

            let factor = Math.pow(newTouchDistance / touchDistance, 2);
            zooms.push(new SmoothZoom(factor, 0.25));
            touchDistance = newTouchDistance;
        }
        prevTouches = touches;
    };

    this.touchEnd = function(touches) {
        if (touches.length == 1) {
            if (touches.length < prevTouches.length) {
                var mousepos = {
                    x: touches[0].x,
                    y: touches[0].y
                };
                this.mouseDown(mousepos, 0);
            } else {
                var mousepos = {
                    x: touches[0].x,
                    y: touches[0].y
                };
                this.mouseUp(mousepos, 0);
            }
        } else if (touches.length > 1) {
            let t1 = touches[0], t2 = touches[1];
            let xDist = t2.x - t1.x, yDist = t2.y - t1.y;
            let finalTouchDistance = Math.sqrt((xDist*xDist) + (yDist*yDist));

            let zoomX, zoomY;

            zoomX = t1.x + (t2.x - t1.x)/2;
            zoomY = t1.y + (t2.y - t1.y)/2;

            var mousepos = {
                x: zoomX,
                y: zoomY
            };

            let factor = Math.pow(finalTouchDistance / touchDistance, 2);
            zooms.push(new SmoothZoom(factor, 0.25));
            touchDistance = null;

            this.mouseUp(mousepos, 0);
        } else if (prevTouches.length > 0){
            var mousepos = {
                x: prevTouches[0].x,
                y: prevTouches[0].y
            };
            this.mouseUp(mousepos, 0);
        }
        prevTouches = touches;
    };

    this.isDragging = function() {
        return dragging;
    };

    let keysDown = {
        left: false,
        right: false,
        up: false,
        down: false,
        minus: false,
        plus: false
    }

    this.keyPressed = function(key) {
        switch(key) {
            case "ArrowLeft":
                keysDown.left = true;
                break;
            case "ArrowRight":
                keysDown.right = true;
                break;
            case "ArrowUp":
                keysDown.up = true;
                break;
            case "ArrowDown":
                keysDown.down = true;
                break;
            case "-":
                keysDown.minus = true;
                break;
            case "+":
                keysDown.plus = true;
                break;
        }
    };

    this.keyReleased = function(key) {
        switch(key) {
            case "ArrowLeft":
                keysDown.left = false;
                break;
            case "ArrowRight":
                keysDown.right = false;
                break;
            case "ArrowUp":
                keysDown.up = false;
                break;
            case "ArrowDown":
                keysDown.down = false;
                break;
            case "-":
                keysDown.minus = false;
                break;
            case "+":
                keysDown.plus = false;
                break;
        }
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
        let factor = Math.pow(0.675, deltaY);
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

        if (keysDown.plus) {
            this.setZoomFraction(this.getZoomFraction() + 0.01);
        } else if (keysDown.minus) {
            this.setZoomFraction(this.getZoomFraction() - 0.01);
        }

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

        //perform panning for keyboard events
        let dir = {x: 0, y: 0};

        if (keysDown.left) dir.x -= 1;
        if (keysDown.right) dir.x += 1;
        if (keysDown.up) dir.y += 1;
        if (keysDown.down) dir.y -= 1;

        //normalize
        dir.length = Math.sqrt(dir.x*dir.x + dir.y*dir.y);

        if (dir.length > 0) dir.x /= dir.length;
        if (dir.length > 0) dir.y /= dir.length;

        //move the position accordingly.
        p.x += 10 * dir.x/scale;
        p.y += 10 * dir.y/scale;

        //Set camera session state.
        Session.set('camera', {p: p, scale: scale});
    };

    this.onZoom = function(callback) {
        onZoomCallbacks.push(callback);
    }
};
