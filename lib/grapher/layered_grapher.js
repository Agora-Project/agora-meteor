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

        //Find root.
        let root = postCollection.findOne({target: { "$exists" : false }});

        //Assign layers based on topological depth.
        {
            //Start at root.
            let frontier = new IdentitySet();
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

        let target = postCollection.findOne({_id: post.target});
        if (!target) {
            console.log("No target found!");
            return;
        }

        if (!target.position) console.log(target);

        //Will always insert after the targets rightmost reply, shifting existing posts to the right.
        let y = target.position.y - 1;
        let x = target.position.x;
        post.position = {x: x, y: y};

        /**add the post to the end of the line under the post it's replying to.
            *find every sibling post of it's parent that's to the right of it, and of their parents, and move them all \
            to the right.

            while
            	find parent of current target
            	check if any of it's siblings are to the right of the inserted post
            	if so add them to the list to move further right.*/

        //Find the chain of posts which need to be adjusted.
        if (target.replies.length > 0) {
            let shifting = false;
            let postsToShift = [];
            let targetId = target.target;

            redoLayout = true; //This variable is checked by the code in periodicLayout.js

            //posts above...
            while (targetId) {
                postCollection.find({target: targetId}, {sort: {'defaultPosition.x': 1}}).forEach(function(post) {

                    //first, increase the size of their subtree variables by 1.
                    postCollection.update({_id: post._id}, {$inc: {subtreeWidth: 1}});

                    //Then check if we need to add it to the list of posts to shift.
                    if (shifting) {
                        if (post.position.x <= x) {
                            shifting = false;
                        }
                    }
                    else if (post.position.x > x) {
                        shifting = true;
                    }

                    if (shifting) {
                        postsToShift.push(post);
                    }
                });

                targetId = postCollection.findOne({_id: targetId}).target;
            };

            //...and all of a posts siblings.
            for (let id of target.replies) {
                let sibling = postCollection.findOne({_id: id});
                if (sibling)
                    postsToShift.push(sibling);
                else {
                    console.log("Error! Undefined post!")
                    console.log(target);
                }
            }

            //Shift found posts one column to the right, and all of their children, too.
            for (let postToShift of postsToShift) {
                //prevent errors
                if (!postToShift) {
                    console.log("shifting undefined post!");
                    continue;
                }

                //move the post one position to the right.
                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': 1}});
                changedPosts.push(postCollection.findOne({_id: postToShift._id}));
                postCollection.find({target: postToShift._id}).forEach(function(child) {
                    postsToShift.push(child);
                });
            }

        }

        console.log(post);

        postCollection.insert(post);

        return {post: post, changedPosts: changedPosts};
    },
    removePost: function(postCollection, post) {

        post = postCollection.findOne({_id: post._id});

        let changedPosts = [];

        if (!post) return {post: post, changedPosts: []};

        let target = postCollection.findOne({_id: post.target});
        let x = post.position.x;

        let repliesPresent = false;

        //avoid shifting the graph if there are replies below this would cover up.
        for (replyID of post.replies) {
            if (!repliesPresent && postCollection.findOne({_id: replyID}));
                repliesPresent = true;
        }

        //Adjust positioning of other posts in graph appropriately, if necessary.
        if (!repliesPresent && target && target.replies.length > 1) {
            let shifting = false;
            let postsToShift = [];
            let targetId = target.target;

            redoLayout = true; //This variable is checked by the code in periodicLayout.js

            //posts above...
            while (targetId) {
                postCollection.find({target: targetId}, {sort: {'position.x': 1}}).forEach(function(post) {

                    //first, decrease the size of their subtree variables by 1.
                    postCollection.update({_id: post._id}, {$inc: {subtreeWidth: -1}});

                    //Then check if we need to add it to the list of posts to shift.
                    if (shifting) {
                        if (post.position.x <= x) {
                            shifting = false;
                        }
                    }
                    else if (post.position.x > x) {
                        shifting = true;
                    }

                    if (shifting) {
                        postsToShift.push(post);
                    }
                });
                let curPost = postCollection.findOne({_id: targetId});
                if (curPost) targetId = curPost.target;
                else targetId = null;
            };

            shifting = false;

            //...and all of a posts siblings that are right of them.
            for (let id of target.replies) {
                let post = postCollection.findOne({_id: id});
                if (post) {
                    if (shifting) {
                        if (post.position.x <= x) {
                            shifting = false;
                        }
                    }
                    else if (post.position.x > x) {
                        shifting = true;
                    }

                    if (shifting) {
                        postsToShift.push(post);
                    }
                }
            }

            //Shift found posts one column to the left, and all of their children, too.
            for (let postToShift of postsToShift) {
                if (!postToShift)
                    continue;
                postCollection.update({_id: postToShift._id}, {$inc: {'position.x': -1}});
                changedPosts.push(postCollection.findOne({_id: postToShift._id}));
                postCollection.find({target: postToShift._id}).forEach(function(child) {
                    postsToShift.push(child);
                });
            }

        }

        //delete the post
        postCollection.remove(post);

        return {post: post, changedPosts: changedPosts};
    }
}
