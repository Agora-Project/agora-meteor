Camera = function(canvas) {
    let x = 0.0, y = 0.0;
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
            matrix = [w, 0.0, -w*x,
                      0.0, h, -h*y,
                      0.0, 0.0, 1.0];
            matrixDirty = false;
        }
        return matrix;
    };
};
