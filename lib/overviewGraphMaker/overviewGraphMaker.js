//requestAnimationFrame polyfill - https://gist.github.com/paulirish/1579671
//MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
//End polyfill

MakeOverviewGraph = function(overviewTemplate, nodeTemplate, postTemplate, postSupplier) {
    overviewTemplate.onCreated(function() {
        this.displayedPost = new Mongo.Collection(null);
        this.postCollection = new Mongo.Collection(null);
        let instance = this;
        let postSubscription = this.subscribe('newestPosts', Date.now());

        this.autorun(function() {
            if (postSubscription.ready()) {
                postSupplier(instance, instance.postCollection);

                let posts = {};
                instance.postCollection.find({}, {limit: 1000}).forEach(function(post) {
                    posts[post._id] = {
                        data: post,
                        div: $('#overview-node-' + post._id)
                    };
                });

                let postArray = [];
                let linkArray = [];

                $.each(posts, function(id, post) {
                    if (post.data.links) {
                        for (let link of post.data.links) {
                            if (link.target in posts) {
                                linkArray.push({
                                    source: post,
                                    target: posts[link.target]
                                });
                            }
                        }
                    }

                    postArray.push(post);
                });

                //let layout = new GraphLayoutForce(postArray, linkArray);
                let layout = new GraphLayoutDagre(postArray, linkArray);

                this.postArray = layout.nodes;

                for (let post of layout.nodes) {
                    if (post.name !== undefined) {
                        let div = post.name.div;
                        div.css("left", post.x - div.outerWidth()/2.0);
                        div.css("top", post.y - div.outerHeight()/2.0);
                    }
                }

                $('.overview-link').remove(); //TODO: don't redo all links upon change to graph
                let svg = $('.overview-links-graph');

                for (let link of layout.links) {
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
        });
    });

    overviewTemplate.onRendered(function() {
        let template = Template.instance();
        let centerer = $('.overview-centerer');
        template.position = centerer.position();

        let animate = function() {
            if (template.isPositionDirty) {
                centerer.css({left: template.position.left, top: template.position.top});
                template.isPositionDirty = false;
            }

            window.requestAnimationFrame(animate);
        }

        window.requestAnimationFrame(animate);
    });

    overviewTemplate.events({
        'mousedown, touchstart': function(event, template) {
            if (event.button != 0) return;
            template.dragging = true;
            template.mousePos = {x: event.screenX, y: event.screenY};
        },
        'mouseup, touchend': function(event, template) {
            template.dragging = false;
        },
        'mousemove, touchmove': function(event, template) {
            if (template.dragging) {
                let dx = (event.screenX - template.mousePos.x);
                let dy = (event.screenY - template.mousePos.y);

                if (dx !== 0 || dy !== 0) {
                    template.isPositionDirty = true;
                    template.position.left += dx;
                    template.position.top += dy;
                    template.mousePos = {x: event.screenX, y: event.screenY};
                }
            }
        }
    });

    overviewTemplate.helpers({
        displayedPost: function() {
            return Template.instance().displayedPost.find({});
        },
        nodes: function() {
            return Template.instance().postCollection.find({}, {limit: 1000});
        }
    });

    nodeTemplate.onCreated(function() {
        let parentView = this.view.parentView;
        while (parentView.templateInstance === undefined) {
            parentView = parentView.parentView;
        }
        this.parent = parentView.templateInstance();
    });

    nodeTemplate.events({
        'mousedown .undraggable, touchstart .undraggable': function(event) {
            if (event.button != 0) return;
            event.stopImmediatePropagation();
        },
        "mouseenter": function(event, template) {
            template.parent.displayedPost.remove({});
            template.parent.displayedPost.insert(this);
        },
        "mouseleave": function(event, template) {
            template.parent.displayedPost.remove({});
        }
    });

    postTemplate.onRendered(function () {
        var instance = Template.instance();

        var postLink = instance.$('.overview-post-header a');
        postLink.attr('title', postLink.text());

        var usernameLink = instance.$('.overview-username');
        usernameLink.attr('title', usernameLink.text());

        if (this.data.content) {
            instance.$('.overview-post-content').html(XBBCODE.process({
                text: this.data.content,
                removeMisalignedTags: false,
                addInLineBreaks: true
            }).html);
        }

        let post = instance.$(".overview-post");
        let point = $("#overview-node-" + this.data._id);
        post.css("left", parseInt(point.css("left")) + 20).css("top", point.css("top"));
    });

    postTemplate.helpers({
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
}
