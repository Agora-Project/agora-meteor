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

        //Posts that are ready to be added to the table.
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
                let layer = current.layer + 1;
                //if That element can be loaded.
                if (current != null) {

                    //Go through the elements replies and assign them to the next layer down.
                    postCollection.find({inReplyTo: current.id}).forEach(function(reply) {
                        postCollection.update({_id: reply._id}, {$set: {layer: layer, "position.y": -layer}});
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

    //Assigns relative positions to all posts.
    assignRelativePositions: function(postCollection) {
        let self = this;
        postCollection.find({}).fetch().forEach(function(post) {

            self.assignRelativePositionsToChildren(postCollection, post);
        });
    },

    //Assigns relative positions to children of a given post, and returns those children.
    assignRelativePositionsToChildren: function(postCollection, post) {
        let relativePos = 0;

        //Assign relative positions, compared to their target post.
        postCollection.find({inReplyTo: post.id}, {sort: {subtreeWidth: 1} }).forEach(function(below) {
            //assigning them relative positions based on the size of their prior siblings subtrees.
            postCollection.update({_id: below._id}, {$set: {relativePos: relativePos}});
            relativePos += below.subtreeWidth;
        });
    },

    //Calculate absolute positions.
    assignFinalPositions: function(postCollection, table) {
        for (let layer of table) {
            for (let node of layer) {
                this.assignFinalPositionsToChildren(postCollection, postCollection.findOne({_id: node._id}));
            }
        }
    },

    assignFinalPositionsToChildren: function(postCollection, post) {
        postCollection.find({inReplyTo: post.id}).forEach(function(child) {
            postCollection.update({_id: child._id}, {$set: {"position.x": post.position.x + child.relativePos}});
        });
    },

    layoutGraph: function(postCollection) {

            //Setup fields.
        postCollection.find({}).fetch().forEach(function(node) {
            postCollection.update({_id: node._id}, {$set: {layer: 0, position: {x: 0, y: 0}, subtreeWidth: 1, relativePos: 0, replyCount: postCollection.find({inReplyTo: node.id}).count()}});
        });

        let table = this.tableGraph(postCollection);

        this.calculateSubtreesFromTable(postCollection, table);

        this.assignXCoordinatesToOrphans(postCollection);

        this.assignRelativePositions(postCollection);

        this.assignFinalPositions(postCollection, table);
    },

    //Find an arbitrary selection of posts, get their id's, perform an operation on them, and return their id's.
    adjustGraph: function(postCollection, selection, operation) {
        let changedPosts = new Set();
        postCollection.find(selection).forEach(function(postToShift) {
            if (!postToShift)
                return;
            postCollection.update({_id: postToShift._id}, operation);
            changedPosts.add(postToShift._id);
        });
        return changedPosts;
    },

    //Shift the graph to the right of the given position by the given amount.
    shiftGraph: function(postCollection, position, amount) {
        return this.adjustGraph(postCollection, {'position.x': {$gt: position}}, {$inc: {'position.x': amount}});
    },

    insertPost: function(postCollection, post, direction) {

        let changedPosts = new Set();

        let layer, x, y, shiftGraph = false;

        post.subtreeWidth = 0;

        postCollection.find({inReplyTo: post.id}).forEach(function(child) {
            post.subtreeWidth += child.subtreeWidth;
        });

        post.subtreeWidth = Math.max(post.subtreeWidth, 1);

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

        post.replyCount = postCollection.find({inReplyTo: post.id}).count();
        postCollection.insert(post);
        postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: 1, subtreeWidth: post.subtreeWidth}});

        return {post: post, changedPosts: changedPosts};
    },

    //trace the graph up as far as we can and then reposition posts from there down.
    repositionRelations: function(postCollection, post) {
        let changedPosts;
        let parent = postCollection.findOne({id: post.inReplyTo});
        if (parent) changedPosts = this.repositionRelations(postCollection, parent);
        else changedPosts = this.repositionDescendants(postCollection, post);


        return changedPosts;
    },

    //reposition all the posts below this one.
    repositionDescendants: function(postCollection, post) {
        let changedPosts = new Set();
        this.assignRelativePositionsToChildren(postCollection, post);
        this.assignFinalPositionsToChildren(postCollection, post);
        let self = this;
        postCollection.find({inReplyTo: post.id}).forEach(function(child) {
            self.repositionDescendants(postCollection, child).forEach((id) => {
                changedPosts.add(id);
            });
        });

        return changedPosts;
    },

    //Returns true or false, depending on whether or not this is a post we should consolidate the graph after removing.
    consolidateAfterPost: function(postCollection, post) {
        return (postCollection.find({'position.x': post.position.x}).count() == 1 || //If this post doesn't share it's column with another post, or
            (postCollection.find({inReplyTo: post.inReplyTo}).count() > 1 && //If it has a sibling and
             !postCollection.findOne({'position.x': post.position.x, 'position.y': {$lt: post.position.y}}))); //There are no posts beneath it.
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

        if (this.consolidateAfterPost(postCollection, post)) {
            //shift the rest of the graph appropriately.
            changedPosts = this.shiftGraph(postCollection, x, -1);
        }

        //delete the post
        postCollection.remove(post);

        //adjust the subtreeWidth and replycount of the parent, if it's present.
        let parent = postCollection.findOne({id: post.inReplyTo});
        if (parent) {
            let subtreeWidth = Math.max(parent.subtreeWidth - post.subtreeWidth, 1);

            postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: -1}, $set: {subtreeWidth: subtreeWidth}});
        }

        return {post: post, changedPosts: changedPosts};
    }
}

LayeredGraph = function(postCollection) {

}
