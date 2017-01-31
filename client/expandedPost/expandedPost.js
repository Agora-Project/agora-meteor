/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/


var unFocus = function () {
    if (document.selection) {
        document.selection.empty();
    } else {
        window.getSelection().removeAllRanges();
    }
}

Template.expandedPost.onRendered(function () {
    var instance = Template.instance();

    if(this.data.content)
        instance.$('.expanded-post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

});

Template.expandedPost.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    },
    editAccess: function() {
        return ((this.ownerId && this.ownerId === Meteor.userId()) ||
        Roles.userIsInRole(Meteor.userId(), ['moderator']));
    },
    age: function() {
        return new Date(this.postedOn).toDateString();
    }
});

Template.hourglassView.onCreated(function() {

    this.nodeDisplay = new Mongo.Collection(null);
    this.postDisplay = new Mongo.Collection(null);

    overviewObject = this; // !! Global variable!

    let postSubscription = this.subscribe('newestPosts', Date.now());

    this.autorun(function() {
        if (postSubscription.ready()) {
            let posts = {}, postsToProcess = [overviewObject.data];

            //Go through and grab the post and all posts above it, and add them
            //to the graph.
            while (postsToProcess.length > 0) {
                let post = postsToProcess[0];
                if (!posts[post._id]) {
                    overviewObject.nodeDisplay.insert(post);
                    posts[post._id] = {
                        data: post,
                        div: $('#hourglass-node-' + post._id)
                    };
                }
                for (var i of post.links) {
                    let linkID = i.target;
                    let doc = Post.findOne({_id: linkID});
                    postsToProcess.push(doc);

                }
                postsToProcess.splice(0,1);
            }

            //Go through and grab the post and all posts below it, and add them
            //to the graph.
            postsToProcess = [overviewObject.data];
            while (postsToProcess.length > 0) {
                let post = postsToProcess[0];
                if (!posts[post._id]) {
                    overviewObject.nodeDisplay.insert(post);
                    posts[post._id] = {
                        data: post,
                        div: $('#hourglass-node-' + post._id)
                    };
                }

                for (var replyID of post.replyIDs) {
                    let doc = Post.findOne({_id: replyID});
                    postsToProcess.push(doc);
                }
                postsToProcess.splice(0,1);
            }

            let postArray = [];
            let linkArray = [];

            $.each(posts, function(id, post) {
                if (post.data.links)
                for (let link of post.data.links) {
                    if (link.target in posts) {
                        linkArray.push({
                            source: post,
                            target: posts[link.target]
                        });
                    }
                }
                postArray.push(post);
            });

            //let layout = new GraphLayoutForce(postArray, linkArray);
            let layout = new GraphLayoutLayered(postArray, linkArray);

            overviewObject.postArray = layout.nodes;

            overviewObject.render = function() {
                for (let post of layout.nodes) {
                    if (post.name !== undefined) {
                        let div = post.name.div;
                        div.css("left", post.x - div.outerWidth()/2.0);
                        div.css("top", post.y - div.outerHeight()/2.0);
                    }
                }

                $('.hourglass-link').remove(); //TODO: don't redo all links upon change to graph
                let svg = $('.hourglass-links-graph');

                for (let link of layout.links) {
                    $(document.createElementNS('http://www.w3.org/2000/svg','line'))
                        .attr('class', 'hourglass-link')
                        .attr('stroke', 'black')
                        .attr('x1', link.source.x)
                        .attr('y1', link.source.y)
                        .attr('x2', link.target.x)
                        .attr('y2', link.target.y)
                        .appendTo(svg);
                }
            }

            overviewObject.render();
        }
    });
});

Template.hourglassView.events({
    'mousedown, touchstart': function(event, template) {
        if (event.button != 0) return;
        template.dragging = true;
        template.counter = 0;
        template.mousePos = {x: event.screenX, y: event.screenY};
    },
    'mouseup, touchend': function(event, template) {
        template.dragging = false;
        overviewObject.render();
    },
    'mousemove, touchmove': function(event, template) {
        if (template.dragging) {
            unFocus();
            for (let post of overviewObject.postArray) {
                post.x += (event.screenX - template.mousePos.x);
                post.y += (event.screenY - template.mousePos.y);
            }
            template.mousePos = {x: event.screenX, y: event.screenY};

            //Horrible hack to improve performance.
            //TODO: Replace with a requestAnimationFrame() callback.
            if (template.counter <= 0) {
                overviewObject.render();
                template.counter = 3;
            }
            else {
                template.counter--;
            }
        }
    }
});

Template.hourglassView.helpers({
    postDisplay: function() {
        return Template.instance().postDisplay.find({});
    },
    nodes: function() {
        return Template.instance().nodeDisplay.find({});
    }
});

Template.hourglassNode.events({
    'mousedown .undraggable, touchstart .undraggable': function(event) {
        if (event.button != 0) return;
        event.stopImmediatePropagation();
    },
    "mouseenter": function(event) {
        overviewObject.postDisplay.remove({});
        overviewObject.postDisplay.insert(this);
    },
    "mouseleave": function(event) {
        overviewObject.postDisplay.remove({});
    }
});

Template.hourglassPost.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());

    if(this.data.content)
        instance.$('.post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

    let post = instance.$(".post");
    let point = $("#hourglass-node-" + this.data._id);
    post.css("left", parseInt(point.css("left")) + 20).css("top", point.css("top"));

});

Template.hourglassPost.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    },
    age: function() {
        return new Date(this.postedOn).toDateString();
    }
});
