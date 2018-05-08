/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

LayeredGrapher = {

    layoutGraph: function(postCollection) {

        //Set up fields and find root posts.
        let roots = [];
        postCollection.find({}).fetch().forEach(function(node) {

            //Setup fields.
            postCollection.update({_id: node._id}, {$set: {layer: 0, position: {x: 0, y: 0}, subtreeWidth: 1, relativePos: 0, replyCount: postCollection.find({inReplyTo: node._id}).count()}});

            //Find root posts.
            if (!node.inReplyTo || !postCollection.findOne({_id: node.inReplyTo})) {
                postCollection.update({_id: node._id}, {$set: {orphaned: true}});
                roots.push(postCollection.findOne({_id: node._id}));
            }
        });

        //Assign layers based on topological depth.

        let maxLayer = 0
        let table = [];

        //Start at root.
        let frontier = new IdentitySet();
        for (let root of roots)
            frontier.add(root);

        //Traverse graph, assigning layers and remembering the max layer assigned.
        while (!frontier.isEmpty()) {
            maxLayer++;
            let curLayer = [];
            let newFrontier = new IdentitySet();

            //For each element
            for (let current of frontier.elements) {

                //if That element can be loaded.
                if (current != null) {

                    //Go through the elements replies and assign them to the next layer down.
                    postCollection.find({inReplyTo: current._id}).forEach(function(reply) {
                        postCollection.update({_id: reply._id}, {$set: {layer: current.layer + 1}});
                        newFrontier.add(postCollection.findOne({_id: reply._id}));
                    });

                    curLayer.push(current);
                }
            }

            frontier = newFrontier;

            table.push(curLayer);
        }

        //Calculate subtree dimensions.

        //Go from the bottom of the tree up.
        for (let i = maxLayer - 1; i >= 0; i--) {
            let layer = table[i];

            for (let node of layer) {

                //If a node has replies...
                if (postCollection.find({inReplyTo: node._id}).count() > 0) {

                    //A posts subtree width is equal to the width of all it's replies subtrees.
                    postCollection.find({inReplyTo: node._id}).forEach(function(below) {
                        postCollection.update({_id: node._id}, {$inc: {subtreeWidth: below.subtreeWidth}});
                    });

                    //Decrease the subtreeWidth by one for posts with replies, to account for it starting at
                    //one even for posts without replies.
                    postCollection.update({_id: node._id}, {$inc: {subtreeWidth: -1}});
                }
            }
        }

        let x = 0;

        //Assign x coordinates based on their the size of their subtrees.
        postCollection.find({orphaned: true}, {sort: {subtreeWidth: 1} }).forEach(function(node) {
            postCollection.update({_id: node._id}, {$set: {"position.x": x}});
            x += node.subtreeWidth;
        });

        //Assign relative positions to nodes that aren't root.
        postCollection.find({}).fetch().forEach(function(node) {

            let relativePos = 0;

            //Assigne relative positions, compared to their target node.
            postCollection.find({inReplyTo: node._id}, {sort: {subtreeWidth: 1} }).forEach(function(below) {
                postCollection.update({_id: below._id}, {$set: {relativePos: relativePos}});
                relativePos += below.subtreeWidth;
            });

            postCollection.update({_id: node._id}, {$set: {"position.y": -node.layer}});
        });

        //Calculate absolute positions.
        for (let layer of table) {
            for (let node of layer) {
                let currentNode = postCollection.findOne({_id: node._id});
                postCollection.find({inReplyTo: node._id}).forEach(function(next) {
                    postCollection.update({_id: next._id}, {$set: {"position.x": currentNode.position.x + next.relativePos}});
                });
            }
        }

    },
    insertPost: function(postCollection, post) {

        let changedPosts = [];

        let x = Infinity, y = -Infinity, shiftGraph = false, foundPlace = false;

        let target = postCollection.findOne({_id: post.inReplyTo});

        //If possible, find the leftmost reply with an empty spot above it and put the post there.
        for (let replyID of post.replies) {
            let reply = postCollection.findOne({_id: replyID});
            if (!reply) continue;

            if (!postCollection.findOne({'position.x': reply.position.x, 'position.y' : reply.position.y + 1})) {
                if (y <= reply.position.y + 1 && x >= reply.position.x) {
                    y = reply.position.y + 1;
                    x = reply.position.x;
                    foundPlace = true;
                }
            }
        }

        if (!foundPlace) {
            if (target) {

                //Insert beneath the parent post.
                y = target.position.y - 1;
                x = target.position.x;

                if (postCollection.findOne({inReplyTo: post.inReplyTo})) shiftGraph = true
            } else {

                //Will always insert after the targets rightmost reply, shifting existing posts to the right.
                y = 0;
                x = 0;

                if (postCollection.findOne({inReplyTo: { "$exists" : false }})) shiftGraph = true;
            }
        }

        post.position = {x: x, y: y};

        /**add the post to the end of the line under the post it's replying to.
            *find every sibling post of it's parent that's to the right of it, and of their parents, and move them all \
            to the right.*/

        //Find the chain of posts which need to be adjusted.
        if (shiftGraph) {
            //This includes the ones to the right of the new post
            postCollection.find({'position.x': {$gt: x}}).forEach(function(postToShift) {

                //if post is not actually present, move on to the next one.
                if (!postToShift) return;

                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.push({_id: post._id, position: post.position});
            });

            //As well as those directly beneath it.
            postCollection.find({'position.x': x, 'position.y': {$lt: y + 1}}).forEach(function(postToShift) {

                //if post is not actually present, move on to the next one.
                if (!postToShift) return;

                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.push({_id: post._id, position: post.position});
            });
        }

        post.replyCount = postCollection.find({inReplyTo: post._id}).count();
        postCollection.insert(post);
        postCollection.update({_id: post.inReplyTo}, {$inc: {replyCount: 1}});

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

        //if this doesn't share it's row with another post, or if it had siblings but no children,
        //shift the rest of the graph appropriately.
        if (postCollection.find({'position.x': post.position.x}).count() <= 1 ||
            (postCollection.find({inReplyTo: post.inReplyTo}).count() > 1 &&
             !postCollection.findOne({inReplyTo: post._id}))) {
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
        postCollection.update({_id: post.inReplyTo}, {$inc: {replyCount: -1}});

        return {post: post, changedPosts: changedPosts};
    }
}
