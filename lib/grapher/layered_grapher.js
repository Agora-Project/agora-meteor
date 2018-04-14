/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

LayeredGrapher = {

    layoutGraph: function(postCollection) {

        //Set up fields.
        postCollection.find({}).fetch().forEach(function(node) {
            postCollection.update({_id: node._id}, {$set: {layer: 0, position: {x: 0, y: 0}, subtreeWidth: 1, relativePos: 0}});
        });

        //Find root posts.
        let roots = postCollection.find({target: { "$exists" : false }}).fetch();

        //Assign layers based on topological depth.
        {
            //Start at root.
            let frontier = new IdentitySet();
            for (let root of roots)
                frontier.add(root);

            //Traverse graph.
            while (!frontier.isEmpty()) {
                let newFrontier = new IdentitySet();

                for (let current of frontier.elements) {
                  if (current != null) {
                    for (let nextID of current.replies) {
                        postCollection.update({_id: nextID}, {$set: {layer: current.layer + 1}});
                        newFrontier.add(postCollection.findOne({_id: nextID}));
                    }
                  }
                }

                frontier = newFrontier;
            }
        }

        //Construct table.
        let maxLayer = 0

        postCollection.find({}).fetch().forEach(function(node) {
            maxLayer = Math.max(maxLayer, node.layer);
        });

        let table = [];

        for (let i = 0; i <= maxLayer; i++) {
            table.push([]);
        }

        let insertNode = function(node) {
            let layer = table[node.layer];
            layer.push(node);
        }

        postCollection.find({}).fetch().forEach(function(node) {
            insertNode(node);
        });

        //Calculate subtree dimensions.
        for (let i = maxLayer - 1; i >= 0; i--) {
            let layer = table[i];

            for (let node of layer) {
                if (!node) continue;
                if (node.replies && node.replies.length > 0) {
                    for (let belowID of node.replies) {
                        let below = postCollection.findOne({_id: belowID});
                        if (!below) continue;
                        postCollection.update({_id: node._id}, {$inc: {subtreeWidth: below.subtreeWidth}});
                    }

                    postCollection.update({_id: node._id}, {$inc: {subtreeWidth: -1}});
                }
            }
        }

        //Assign relative positions.
        postCollection.find({}).fetch().forEach(function(node) {

            let x = 0.0;

            let replyArray = [];
            for (let replyID of node.replies) {
                if (!replyID) continue;
                replyArray.push(postCollection.findOne({_id: replyID}));
            }
            if (replyArray.length > 1) {
                //Arrange edgesIn arrays to put bigger subtrees away from center.
                replyArray.sort(function(a, b) {
                    return a.subtreeWidth - b.subtreeWidth;
                });

            }

            for (let below of replyArray) {
                if (!below) continue;
                postCollection.update({_id: below._id}, {$set: {relativePos: x}});
                x += below.subtreeWidth;
            }

            postCollection.update({_id: node._id}, {$set: {"position.y": -node.layer}});
        });

        //Calculate absolute positions.
        for (let layer of table) {
            for (let node of layer) {
                let currentNode = postCollection.findOne({_id: node._id});
                for (let nextID of node.replies) {
                    let next = postCollection.findOne({_id: nextID});
                    if (!next) continue;
                    postCollection.update({_id: next._id}, {$set: {"position.x": currentNode.position.x + next.relativePos}});

                }
            }
        }
    },
    insertPost: function(postCollection, post) {

        let changedPosts = [];

        let y, x, shiftGraph = false;;

        let target = postCollection.findOne({_id: post.target});
        if (target) {
            let siblings = postCollection.find({target: post.target}).fetch().length;

            //Will always insert after the targets rightmost reply, shifting existing posts to the right.
            y = target.position.y - 1;
            x = target.position.x + siblings;

            if (siblings > 0) shiftGraph = true;
        } else {
            let roots = postCollection.find({target: { "$exists" : false }}).fetch().length;

            //Will always insert after the targets rightmost reply, shifting existing posts to the right.
            y = 0;
            x = roots;

            if (roots > 0) shiftGraph = true;
        }

        post.position = {x: x, y: y};

        /**add the post to the end of the line under the post it's replying to.
            *find every sibling post of it's parent that's to the right of it, and of their parents, and move them all \
            to the right.*/

        //Find the chain of posts which need to be adjusted.
        if (shiftGraph) {
            postCollection.find({'position.x': {$gt: x-1}}).forEach(function(postToShift) {
                if (!postToShift)
                    return;
                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.push({_id: post._id, position: post.position});
            });
        }

        postCollection.insert(post);

        return {post: post, changedPosts: changedPosts};
    },
    removePost: function(postCollection, post) {

        let localPost = postCollection.findOne({_id: post._id});

        let changedPosts = [];

        //If this post is not actually present, just return the post we were given and no changed posts.
        if (!localPost) {
            return { post: post, changedPosts: changedPosts };
        }

        else post = localPost;

        let x = post.position.x;

        //Avoid shifting the graph if this post was beneath or above another post
        if (postCollection.find({'position.x': post.position.x}).fetch().length <= 1) {
            postCollection.find({'position.x': {$gt: x}}).forEach(function(postToShift) {
                if (!postToShift)
                    return;
                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': -1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.push({_id: post._id, position: post.position});
            });
        }

        //delete the post
        postCollection.remove(post);

        return {post: post, changedPosts: changedPosts};
    }
}
