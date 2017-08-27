LayeredGrapher = {

    layoutGraph: function(postArray) {

        let nodes = {};
        postArray.forEach(function(post) {
            nodes[post._id] = {_id: post._id, target: post.target};
        });
        //Set up fields.
        for (let id in nodes) {
            let node = nodes[id];
            node.layer = 0;
            node.column = 0;

            node.position = {};
            node.position.x = 0.0;
            node.position.y = 0.0;

            node.edgesOut = [];
            node.edgesIn = [];

            node.subtreeWidth = 1;
            node.relativePos = 0.0;
        }

        //Populate edge arrays.
        for (let id in nodes) {
            let node = nodes[id];

            if (node.target) {
                let target = nodes[node.target];
                //if (!target) console.log(node);

                node.edgesOut.push(target);
                target.edgesIn.push(node);
            }
        }

        //Find root.
        let root = null;
        for (let id in nodes) {
            let node = nodes[id];

            if (node.edgesOut.length === 0) {
                root = node;
                break;
            }
        }

        //Assign layers based on topological depth.
        {
            //Start at root.
            let frontier = new IdentitySet();
            frontier.add(root);

            //Traverse graph.
            while (!frontier.isEmpty()) {
                let newFrontier = new IdentitySet();

                for (let current of frontier.elements) {
                    for (let next of current.edgesIn) {
                        next.layer = Math.max(current.layer + 1, next.layer);
                        newFrontier.add(next);
                    }
                }

                frontier = newFrontier;
            }
        }

        //Construct table.
        let maxLayer = 0

        for (let id in nodes) {
            let node = nodes[id];
            maxLayer = Math.max(maxLayer, node.layer);
        }

        let table = [];

        for (let i = 0; i <= maxLayer; i++) {
            table.push([]);
        }

        let insertNode = function(node) {
            let layer = table[node.layer];
            node.column = layer.length;
            layer.push(node);
        }

        for (let id in nodes) {
            insertNode(nodes[id]);
        }

        //Calculate subtree dimensions.
        for (let i = maxLayer - 1; i >= 0; i--) {
            let layer = table[i];

            for (let node of layer) {
                if (node.edgesIn.length > 0) {
                    for (let below of node.edgesIn) {
                        node.subtreeWidth += below.subtreeWidth;
                    }

                    node.subtreeWidth -= 1;
                }
            }
        }

        //Assign relative positions.
        for (let id in nodes) {
            let node = nodes[id];

            if (node.edgesIn.length > 1) {
                //Arrange edgesIn arrays to put bigger subtrees away from center.
                node.edgesIn.sort(function(a, b) {
                    return a.subtreeWidth - b.subtreeWidth;
                });
            }

            let x = 0.0;

            for (let below of node.edgesIn) {
                below.relativePos = x;
                x += below.subtreeWidth;
            }

            node.position.y = -node.layer;
        }

        //Calculate absolute positions.
        for (let layer of table) {
            for (let node of layer) {
                for (let next of node.edgesIn) {
                    next.position.x = node.position.x + next.relativePos;
                }
            }
        }

        return nodes;
    },
    insertPost: function(postArray, post) {

        let changedPosts = [];

        let target = postArray.find(function(p) {
            return p._id == post.target;
        });

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
        if (target.edgesIn.length > 0) {
            let shifting = false;
            let postsToShift = [];
            let targetId = target.target;

            redoLayout = true; //This variable is checked by the code in periodicLayout.js

            //posts above...
            while (targetId) {
                postArray.filter(function(p) {return p.target == targetId}).sort(function(a, b) {
                    return a.position.x - b.position.x;
                }).forEach(function(p) {
                    //first, increase the size of their subtree variables by 1.
                    p.subtreeWidth += 1;

                    //Then check if we need to add it to the list of posts to shift.
                    if (shifting) {
                        if (p.position.x <= x) {
                            shifting = false;
                        }
                    }
                    else if (p.position.x > x) {
                        shifting = true;
                    }

                    if (shifting) {
                        postsToShift.push(p);
                    }
                });

                targetId = postArray.find(function(p) { return p._id == targetId}).target;
            };

            //...and all of a posts siblings.
            for (let curPost of target.edgesIn) {
                console.log(curPost)
                if (curPost)
                    postsToShift.push(curPost);
                else {
                    console.log("Error! Undefined post!")
                    console.log(target);
                }
            }

            //Shift found posts one column to the right, and all of their children, too.
            for (let curPost of postsToShift) {
                if (!curPost) {
                    continue;
                }
                curPost.position.x += 1;
                changedPosts.push(curPost);
                postArray.filter(function(p) {return p.target == curPost._id}).forEach(function(child) {
                    postsToShift.push(child);
                });
            }

        }

        target.edgesIn.push(post);
        post.edgesIn = [];

        return {post: post, changedPosts: changedPosts};
    }
}
