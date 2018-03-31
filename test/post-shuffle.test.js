/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

var id = 1;

class VisiblePost {
  constructor(pos) {
    this.x = pos[0];
    this.y = pos[1];
    this._id = id++;
  }
}

var visiblePostsCursor = [];

for (var i = 0; i < 10; i++) {
  visiblePostsCursor.push(new VisiblePost([Math.floor(Math.random() * 200), Math.floor(Math.random() * 200)]));
}
visiblePostsCursor.sort(function(a, b) { return a.x - b.x; });
var postMemo = new Map(); // Keep track of the position of each post

visiblePostsCursor.forEach(function(post) {
    let div;
    console.log("Before shuffling: " + post._id + ": x=" + post.x + ", y=" + post.y);
    div = {name: '#main-detailed-post-' + post._id, width: 100, outerWidth: 100, outerHeight: 100};

    let pleft = post.x - div.outerWidth/2;
    let ptop = post.y - div.outerHeight/2;
    console.log("pleft: " + pleft + ", ptop: " + ptop);
    postMemo.forEach(function(tgtPosition, tgtPost) {
      let tgtx = tgtPosition[0];
      let tgty = tgtPosition[1];
      console.log("pleft: " + pleft + " vs. tgtx: " + tgtx + ", ptop: " + ptop + " vs. tgty: " + tgty);
      if (pleft <= tgtx) {
        pleft += (tgtx - pleft) + 10;
      }
      if (ptop <= tgty) {
        ptop += (tgty - ptop) + 10;
      }
    });
    console.log("pleft: " + pleft + ", ptop: " + ptop);
    postMemo.set(post._id, [pleft + div.outerWidth, ptop + div.outerHeight]);
    console.log("After shuffling: " + post._id + ": x=" + (pleft + div.outerWidth/2) + ", y=" + (ptop + div.outerHeight/2) + "; postMemo's size is now " + postMemo.size);
});
