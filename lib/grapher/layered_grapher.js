/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

LayeredGrapher = {

    //Find root posts.
    findRoots: function(postCollection) {
        let roots = [];
        postCollection.find({}).fetch().forEach(function(node) {

            if (!node.inReplyTo || !postCollection.findOne({id: node.inReplyTo})) {
                postCollection.update({id: node.id}, {$set: {orphaned: true}});
                roots.push(postCollection.findOne({id: node.id}));
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
                        postCollection.update({id: reply.id}, {$set: {layer: layer}});
                        newFrontier.add(postCollection.findOne({id: reply.id}));
                    });

                    curLayer.push(current);
                }
            }

            frontier = newFrontier;

            table.push(curLayer);
        }
        return table;
    },

    //Calculate the subtree for a post, assuming all of it's children have accurate subtrees, and return it.
    calculateSubtreeWidth: function(postCollection, post) {
        //Find a posts replies:
        let replies = postCollection.find({inReplyTo: post.id});

        let subtreeWidth = 0;

       //If a post has replies...
       if (replies.count() > 0) {
           //Add up the sum of its replies subtreeWidths.
           replies.forEach(function(below) {
               subtreeWidth += below.subtreeWidth;
           });
       } else subtreeWidth = 1; //Or set it to 1 if it doesn't have any replies, for it's own width.

       return subtreeWidth;
    },

    //Calculate subtree dimensions.
    calculateSubtreesFromTable: function(postCollection, table) {

        //Go from the bottom of the tree up.
        for (let i = table.length - 1; i >= 0; i--) {
            let layer = table[i];

            for (let post of layer) {
               //And calculate and assign each posts subtreeWidth.
               postCollection.update({id: post.id}, {$set: {subtreeWidth: this.calculateSubtreeWidth(postCollection, post)}});
           }
        }
    },

    //Assign x coordinates to orphaned nodes based on their the size of their subtrees.
    assignXCoordinatesToOrphans: function(postCollection) {
        let x = 0;

        postCollection.find({orphaned: true}, {sort: {subtreeWidth: 1} }).forEach(function(node) {
            postCollection.update({id: node.id}, {$set: {"position.x": x}});
            x += node.subtreeWidth;
        });
    },

    //Assigns relative positions to children of a given post, and returns those children.
    assignRelativePositionsToChildren: function(postCollection, post) {
        let relativePos = 0;

        //Find all the posts children...
        let children = postCollection.find({inReplyTo: post.id}, {sort: {subtreeWidth: 1} })

        children.forEach(function(child) {
            //And assign them relative positions based on the size of their prior siblings subtrees.
            postCollection.update({id: child.id}, {$set: {relativePos: relativePos}});
            relativePos += child.subtreeWidth;
        });

        return children;
    },

    //Assigns relative positions to all posts.
    assignRelativePositions: function(postCollection) {
        let self = this;
        postCollection.find({}).forEach(function(post) {
            self.assignRelativePositionsToChildren(postCollection, post);
        });
    },

    //Calculate absolute positions.
    assignFinalPositions: function(postCollection, table) {
        for (let layer of table) {
            for (let node of layer) {
                this.assignFinalPositionsToChildren(postCollection, postCollection.findOne({id: node.id}));
            }
        }
    },

    assignFinalPositionsToChildren: function(postCollection, post) {
        postCollection.find({inReplyTo: post.id}).forEach(function(child) {
            postCollection.update({id: child.id}, {$set: {"position.x": post.position.x + child.relativePos, "position.y": post.position.y - 1}});
        });
    },

    layoutGraph: function(postCollection) {

            //Setup fields.
        postCollection.find({}).fetch().forEach(function(node) {
            postCollection.update({id: node.id}, {$set: {layer: 0, position: {x: 0, y: 0}, subtreeWidth: 1, relativePos: 0, replyCount: postCollection.find({inReplyTo: node.id}).count()}});
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
            postCollection.update({id: postToShift.id}, operation);
            changedPosts.add(postToShift.id);
        });
        return changedPosts;
    },

    //Shift the graph to the right of the given position by the given amount.
    shiftGraph: function(postCollection, position, amount) {
        return this.adjustGraph(postCollection, {'position.x': {$gt: position}}, {$inc: {'position.x': amount}});
    },

    //Shift the graph to the right of or directly beneath the given position by the given amount.
    shiftGraphBeneath: function(postCollection, position, amount) {
        return this.adjustGraph(postCollection, { $or: [{'position.x': {$gt: position.x}}, {$and: [{'position.x': position.x}, {'position.y': {$lte: position.y} } ] } ] }, {$inc: {'position.x': amount}});
    },

    insertPost: function(postCollection, post, direction) {

        let changedPosts = new Set();

        let layer, x, y, shiftGraph = false;

        post.subtreeWidth = this.calculateSubtreeWidth(postCollection, post);

        let target = postCollection.findOne({id: post.inReplyTo});
        let replies = postCollection.find({inReplyTo: post.id});
        if ((!direction || direction === "up") && replies.count() > 0) {
             //Find the leftmost reply with an empty spot above it and put the post there.
            x = Infinity, y = -Infinity
            replies.forEach(function(reply) {

                if (!postCollection.findOne({'position.x': reply.position.x, 'position.y' : reply.position.y + 1}) && (y <= reply.position.y || (y <= reply.position.y + 1 && x > reply.position.x))) {
                    y = reply.position.y + 1;
                    x = reply.position.x;
                    direction = "up";
                }
            });
        } else {
            if ((!direction || direction === "down") && target) {
                //If no replies can be found, insert beneath the parent post.
                y = target.position.y - 1;
                x = target.position.x;
                direction = "down";

                if (postCollection.findOne({inReplyTo: target.id})) shiftGraph = true;
            } else {

                //If nowhere else, put it at the 0,0 position.
                y = 0;
                x = 0;
                shiftGraph = true;
            }
        }

        post.position = {x: x, y: y};

        if (shiftGraph) {
            changedPosts = this.shiftGraphBeneath(postCollection, post.position, +1);
        }

        post.replyCount = postCollection.find({inReplyTo: post.id}).count();
        postCollection.insert(post);

        if (target) {
            //Update replycount of parent in postCollection.
            postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: 1}});

            //If the target already has replies, add this posts subtreeWidth in full.
            if (target.replyCount > 0) this.updateSubtreeWidths(postCollection, target, post.subtreeWidth);
            //If the target doesn;t have any replies but this posts subtreewidth is greater than 1, add it minus 1.
            else if (post.subtreeWidth > 1) this.updateSubtreeWidths(postCollection, target, post.subtreeWidth - 1);
        }

        return {post: post, changedPosts: changedPosts};
    },

    updateSubtreeWidths: function(postCollection, post, amount) {
        let subtreeWidth = Math.max(post.subtreeWidth + amount, 1);
        console.log(subtreeWidth);
        postCollection.update({id: post.id}, {$set: {subtreeWidth: subtreeWidth}});

        if (post.inReplyTo) {
            let parent = postCollection.findOne({id: post.inReplyTo});
            if (parent) this.updateSubtreeWidths(postCollection, parent, amount);
        }
    },

    //Returns true or false, depending on whether or not this is a post we should consolidate the graph after removing.
    consolidateAfterRemovingPost: function(postCollection, post) {
        return (postCollection.find({'position.x': post.position.x}).count() == 1 || //If this post doesn't share it's column with another post, or
            (postCollection.find({inReplyTo: post.inReplyTo}).count() > 1 && //If it has a sibling and
             !postCollection.findOne({'position.x': post.position.x, 'position.y': {$lt: post.position.y}}))); //There are no posts beneath it.
    },

    removePost: function(postCollection, post) {

        let localPost = postCollection.findOne({id: post.id});

        let changedPosts = new Set();

        //If this post is not actually present, just return the post we were given and no changed posts.
        if (!localPost) {
            console.log("Cannot remove absent post!");
            return {post: post, changedPosts: changedPosts};
        }

        else post = localPost;

        let x = post.position.x;

        if (this.consolidateAfterRemovingPost(postCollection, post)) {
            //shift the rest of the graph appropriately.
            changedPosts = this.shiftGraph(postCollection, x, -1);
        }

        //adjust the subtreeWidth and replycount of the parent, if it's present.
        let parent = postCollection.findOne({id: post.inReplyTo});
        if (parent) {
            //Update replycount of parent in postCollection.
            postCollection.update({id: post.inReplyTo}, {$inc: {replyCount: -1}});

            //Update subtreeWidths of ancestors.
            this.updateSubtreeWidths(postCollection, parent, -post.subtreeWidth);
        }

        //delete the post
        postCollection.remove(post);

        return {post: post, changedPosts: changedPosts};
    },

    //Returns true or false, depending on whether or not this is a post we should expand the graph after inserting.
    expandBeforeInsertingPost: function(postCollection, post, position) {
        //If theres a post already present where this post will go, and that post is not one of this posts siblings
        let present = postCollection.findOne({'position.x': position.x, 'position.y' : position.y});
        if (present && present.inReplyTo !== post.inReplyTo) {
            console.log("Post Present: ", present, post);
            return true;
        }

        //Or if theres a post directly above that this post does not reply to,
        let above = postCollection.findOne({'position.x': position.x, 'position.y' : position.y + 1});
        if (above && above.id !== post.inReplyTo) {
            console.log("Post above: ", above, post);
            return true;
        }

        //Or if theres a post directly beneath that does not reply to this post.
        let below = postCollection.findOne({'position.x': position.x, 'position.y' : position.y - 1});
        if (below && post.id !== below.inReplyTo) {
            console.log("Post below: ", below, post);
            return true;
        }

        return false;
    },

    //Move a post to a new position, and adjust the graph as necessary to make it fit in neatly.
    repositionPost: function(postCollection, post, position) {
        //post = postCollection.findOne({id: post.id});
        //If a post is being repositioned to the exact same place, no operations are necessary.
        if (post.position.x === position.x && post.position.y === position.y) {
            return new Set();
        }

        console.log("Repositioning post: ", post.position, position);

        let changedPosts = new Set();

        //First, do we need to consolidate, expand, both, or neither?
        let consolidate = this.consolidateAfterRemovingPost(postCollection, post);
        let expand = this.expandBeforeInsertingPost(postCollection, post, position);

        //If both:
        if (consolidate && expand) {
            //First, figure out which direction to move posts.

            //If the old x position is greater than the new x position, move posts in between to the right.
            if (post.position.x > position.x) {
                changedPosts = this.adjustGraph(postCollection, {'position.x': {$gte: position.x, $lt: post.position.x}}, {$inc: {"position.x": +1}});
            } else if (post.position.x < position.x) { //If it's smaller, move them to the left.
                changedPosts = this.adjustGraph(postCollection, {'position.x': {$gte: post.position.x, $lt: position.x}}, {$inc: {"position.x": -1}});
            } else console.log("Reposition error: Consolidate & Expand with same X values.");
        } else if (consolidate) {
            //changedPosts = this.shiftGraph(postCollection, post.position.x, -1);
        } else if (expand) {
            //changedPosts = this.shiftGraph(postCollection, position.x, +1);
        }

        let xShift;
        if (post.position.x > position.x) xShift = +1;
        else xShift = -1;

        postCollection.update({id: post.id}, {$set: {position: position}});

        changedPosts.add(post.id);

        return changedPosts;
    },

    //Reposition all the posts descending from this one.
    repositionDescendants: function(postCollection, post) {
        let children = this.assignRelativePositionsToChildren(postCollection, post);

        let changedPosts = new Set();
        for (child of children) {
            let repositionedPosts = this.repositionPost(postCollection, child, {x: post.position.x + child.relativePos, y: post.position.y - 1});
            for (let id of repositionedPosts.values()) {
                changedPosts.add(id);
            }
        }

        for (child of children) {
            this.repositionDescendants(postCollection, child).forEach((id) => {
                changedPosts.add(id);
            });
        }

        return changedPosts;
    },

    //trace the graph up as far as we can and then reposition posts from there down.
    repositionRelations: function(postCollection, post) {
        let changedPosts;
        let parent = postCollection.findOne({id: post.inReplyTo});
        if (parent) changedPosts = this.repositionRelations(postCollection, parent);
        else changedPosts = this.repositionDescendants(postCollection, post);


        return changedPosts;
    },

    //Reposition post and every post it's related too, then return in usual format.
    repositionPosts: function(postCollection, post) {
      return {post: post, changedPosts: this.repositionRelations(postCollection, post)};
    }
}

LayeredGraph = function(postCollection) {

}
