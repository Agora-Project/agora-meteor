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

Template.overview.onCreated(function() {

    this.nodeDisplay = new Mongo.Collection(null);

    overviewObject = this;

    let postSubscription = this.subscribe('newestPosts', Date.now());

    this.autorun(function() {
        if (postSubscription.ready()) {
            let posts = {};

            Post.find({}, {limit: 1000}).forEach(function(post) {
                posts[post._id] = {
                    data: post,
                    div: $('#overview-node-' + post._id)
                };
            });

            let postArray = [];
            let linkArray = [];

            overviewObject.postArray = postArray;
            overviewObject.linkArray = linkArray;

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

            let graph = d3.layout.force()
                .nodes(postArray)
                .links(linkArray)
                .gravity(1.0)
                .charge(-2000)
                .chargeDistance(512)
                .friction(0.9)
                .linkStrength(0.3)
                .linkDistance(function(link) {
                    return 16.0;
                })
                .on("tick", tick);

            // tick
            function tick(e) {
                //This if statement keeps the app from choking when reloading the page.
                if (!graph.nodes()[0] || !graph.nodes()[0].y) { return; }

                var links = graph.links();
                var nodes = graph.nodes();

                var k = 6 * e.alpha;
                links.forEach(function(d, i) {
                    if (d.source.y < d.target.y + 160) {
                        d.target.y -= 1;
                    }
                });
            }

            graph.start();
            for (let i = 0; i < 256; i++) graph.tick();
            graph.stop();

            overviewObject.render = function() {
                for (let post of postArray) {
                    let div = post.div;
                    div.css("left", post.x - div.outerWidth()/2.0);
                    div.css("top", post.y - div.outerHeight()/2.0);
                }

                $('.overview-link').remove(); //TODO: don't redo all links upon change to graph
                let svg = $('.overview-links-graph');

                for (let link of linkArray) {
                    $(document.createElementNS('http://www.w3.org/2000/svg','line'))
                        .attr('class', 'overview-link')
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

Template.overview.events({
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
            for (let i = 0; i < overviewObject.postArray.length; i++) {
                overviewObject.postArray[i].x += (event.screenX - template.mousePos.x);
                overviewObject.postArray[i].y += (event.screenY - template.mousePos.y);
            }
            template.mousePos = {x: event.screenX, y: event.screenY};

            if (template.counter <= 0) {
                overviewObject.render();
                template.counter = 2;
            } else template.counter--;
        }
    }
});

Template.overview.helpers({
    titleDisplay: function() {
        return Template.instance().titleDisplay.find({});
    },
    nodeDisplay: function() {
        return Template.instance().nodeDisplay.find({});
    },
    nodes: function() {
        return Post.find({}, {limit: 1000});
    }
});

Template.overviewNode.events({
    "mouseenter": function(event) {
        overviewObject.nodeDisplay.remove({});
        overviewObject.nodeDisplay.insert(this);
    },
    "mouseleave": function(event) {
        overviewObject.nodeDisplay.remove({});
    }
});

Template.overviewPost.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());

    if(this.data.content)
        instance.$('.postContent').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

    let post = instance.$(".post");
    let point = $("#overview-node-" + this.data._id);
    post.css("left", parseInt(point.css("left")) + 20).css("top", point.css("top"));

});

Template.overviewPost.helpers({
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    user: function() {
        return Meteor.users.findOne(this.posterID);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    }
});
