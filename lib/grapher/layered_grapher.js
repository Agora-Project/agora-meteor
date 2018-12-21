/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

LayeredGrapher = {

    findRoots: function(postCollection) {
        let roots = [];
        postCollection.find({}).fetch().forEach(function(node) {

            //Find root posts.
            if (!node.inReplyTo || !postCollection.findOne({id: node.inReplyTo})) {
                postCollection.update({_id: node._id}, {$set: {orphaned: true}});
                roots.push(postCollection.findOne({_id: node._id}));
            }
        });
        return roots;
    },

    //Assign layers based on topological depth.
    tableGraph: function(postCollection) {

        let table = [];

        //Posts that are ready to sort.
        let frontier = new IdentitySet();

        //Start at root posts
        for (let root of this.findRoots(postCollection))
            frontier.add(root);

        //Traverse graph, assigning layers and remembering the max layer assigned.
        while (!frontier.isEmpty()) {
            let curLayer = [];
            let newFrontier = new IdentitySet();

            //For each element
            for (let current of frontier.elements) {

                //if That element can be loaded.
                if (current != null) {

                    //Go through the elements replies and assign them to the next layer down.
                    postCollection.find({inReplyTo: current.id}).forEach(function(reply) {
                        postCollection.update({_id: reply._id}, {$set: {layer: current.layer + 1}});
                        newFrontier.add(postCollection.findOne({_id: reply._id}));
                    });

                    curLayer.push(current);
                }
            }

            frontier = newFrontier;

            table.push(curLayer);
        }
        return table;
    },

    //Calculate subtree dimensions.
    calculateSubtreesFromTable: function(postCollection, table) {

        //Go from the bottom of the tree up.
        for (let i = table.length - 1; i >= 0; i--) {
            let layer = table[i];

            for (let node of layer) {

                //If a node has replies...
                if (postCollection.find({inReplyTo: node.id}).count() > 0) {

                    //A posts subtree width is equal to the width of all it's replies subtrees.
                    postCollection.find({inReplyTo: node.id}).forEach(function(below) {
                        postCollection.update({_id: node._id}, {$inc: {subtreeWidth: below.subtreeWidth}});
                    });

                    //Decrease the subtreeWidth by one for posts with replies, to account for it starting at
                    //one even for posts without replies.
                    postCollection.update({_id: node._id}, {$inc: {subtreeWidth: -1}});
                }
            }
        }
    },

    //Assign x coordinates to orphaned nodes based on their the size of their subtrees.
    assignXCoordinatesToOrphans: function(postCollection) {
        let x = 0;

        postCollection.find({orphaned: true}, {sort: {subtreeWidth: 1} }).forEach(function(node) {
            postCollection.update({_id: node._id}, {$set: {"position.x": x}});
            x += node.subtreeWidth;
        });
    },

    assignYCoordinatesToNodes: function(postCollection) {
        postCollection.find({}).fetch().forEach(function(node) {

            let relativePos = 0;

            //Assigne relative positions, compared to their target node.
            postCollection.find({inReplyTo: node.id}, {sort: {subtreeWidth: 1} }).forEach(function(below) {
                postCollection.update({_id: below._id}, {$set: {relativePos: relativePos}});
                relativePos += below.subtreeWidth;
            });

            postCollection.update({_id: node._id}, {$set: {"position.y": -node.layer}});
        });
    },

    //Calculate absolute positions.
    calculateFinalPositions: function(postCollection, table) {
        for (let layer of table) {
            for (let node of layer) {
                let currentNode = postCollection.findOne({_id: node._id});
                postCollection.find({inReplyTo: node.id}).forEach(function(next) {
                    postCollection.update({_id: next._id}, {$set: {"position.x": currentNode.position.x + next.relativePos}});
                });
            }
        }
    },

    layoutGraph: function(postCollection) {

            //Setup fields.
        postCollection.find({}).fetch().forEach(function(node) {
            postCollection.update({_id: node._id}, {$set: {layer: 0, position: {x: 0, y: 0}, subtreeWidth: 1, relativePos: 0, replyCount: postCollection.find({inReplyTo: node.id}).count()}});
        });

        let table = this.tableGraph(postCollection);

        this.calculateSubtreesFromTable(postCollection, table);

        this.assignXCoordinatesToOrphans(postCollection);

        this.assignYCoordinatesToNodes(postCollection);

        this.calculateFinalPositions(postCollection, table);
    },
    insertPost: function(postCollection, post, direction) {

        let changedPosts = new Set();

        let x, y, shiftGraph = false;

        let target = postCollection.findOne({id: post.inReplyTo});

        if ((!direction || direction === "down") && target) {
            //Insert beneath the parent post.
            y = target.position.y - 1;
            x = target.position.x;
            direction = "down";

            if (postCollection.findOne({inReplyTo: post.inReplyTo})) shiftGraph = true
        } else if (!direction || direction === "up") {
            //If no target can be found, find the leftmost reply with an empty spot above it and put the post there.
            x = Infinity, y = -Infinity
            postCollection.find({inReplyTo: post.id}).forEach(function(reply) {

                if (!postCollection.findOne({'position.x': reply.position.x, 'position.y' : reply.position.y + 1}) && y < reply.position.y && x >= reply.position.x) {
                    y = reply.position.y + 1;
                    x = reply.position.x;
                    direction = "up";
                }
            });
        } else {

            //If nowhere else, put it at the 0,0 position.
            y = 0;
            x = 0;
            shiftGraph = true;
        }

        post.position = {x: x, y: y};

        /*  *Add the post to the end of the line under the post it's replying to.
            *Find every sibling post of it's parent that's to the right of it, and of their parents, and move them all
            *to the right.*/

        //Find the chain of posts which need to be adjusted.
        if (shiftGraph) {
            //First, posts to the right of the new post
            postCollection.find({'position.x': {$gt: x}}).forEach(function(postToShift) {

                //if post is not actually present, move on to the next one.
                if (!postToShift) {
                    console.log("Post found in collection but not present: ", postToShift);
                    return;
                }

                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.add(post._id);
            });

            //As well as those directly beneath it.
            postCollection.find({'position.x': x, 'position.y': {$lte: y}}).forEach(function(postToShift) {

                //if post is not actually present, move on to the next one.
                if (!postToShift) {
                    console.log("Post found in collection but not present: ", postToShift);
                    return;
                }

                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.add(post._id);
            });
        }

        post.replyCount = postCollection.find({inReplyTo: post.id}).count();
        postCollection.insert(post);
        postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: 1}});

        let replies = postCollection.find({inReplyTo: post.id}).fetch();
        for (let reply of replies) {
            let result = this.removePost(postCollection, reply);
            for (let changedPost of result.changedPosts.values()) {
                changedPosts.add(changedPost);
            }
        }
        for (let reply of replies) {
            let result = this.insertPost(postCollection, reply, direction);
            for (let changedPost of result.changedPosts.values()) {
                changedPosts.add(changedPost);
            }
        }

        return {post: post, changedPosts: changedPosts};
    },
    removePost: function(postCollection, post) {

        let localPost = postCollection.findOne({_id: post._id});

        let changedPosts = new Set();

        //If this post is not actually present, just return the post we were given and no changed posts.
        if (!localPost) {
            return { post: post, changedPosts: changedPosts };
        }

        else post = localPost;

        let x = post.position.x;

        //if this doesn't share it's column with another post, or if it had siblings but no children,
        //shift the rest of the graph appropriately.
        if (postCollection.find({'position.x': post.position.x}).count() == 1 ||
            (postCollection.find({inReplyTo: post.inReplyTo}).count() > 1 &&
             !postCollection.findOne({'position.x': post.position.x, 'position.y': {$lt: post.position.y}}))) {
            postCollection.find({'position.x': {$gt: x}}).forEach(function(postToShift) {
                if (!postToShift)
                    return;
                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': -1}});

                let post = postCollection.findOne({_id: postToShift._id});
                changedPosts.add(post._id);
            });
        }

        //delete the post
        postCollection.remove(post);
        postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: -1}});

        return {post: post, changedPosts: changedPosts};
    }
}

LayeredGraph = function(postCollection) {

}
