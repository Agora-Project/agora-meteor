Template.overview.onCreated(function() {
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
            
            $.each(posts, function(id, post) {
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
                });
            
            graph.start();
            for (let i = 0; i < 256; i++) graph.tick();
            graph.stop();
            
            let centerX = 256.0; //TODO: center graph responsively. preferably with CSS.
            let centerY = 256.0
            
            for (let post of postArray) {
                let div = post.div;
                div.css("left", post.x - div.outerWidth()/2.0 + centerX);
                div.css("top", post.y - div.outerHeight()/2.0 + centerY);
            }
            
            $('.overview-link').remove(); //TODO: don't redo all links upon change to graph
            let svg = $('.overview-links-graph');
            
            for (let link of linkArray) {
                $(document.createElementNS('http://www.w3.org/2000/svg','line'))
                    .attr('class', 'overview-link')
                    .attr('stroke', 'black')
                    .attr('x1', link.source.x + centerX)
                    .attr('y1', link.source.y + centerY)
                    .attr('x2', link.target.x + centerX)
                    .attr('y2', link.target.y + centerY)
                    .appendTo(svg);
            }
        }
    });
});

Template.overview.helpers({
    nodes: function() {
        return Post.find({}, {limit: 1000});
    }
});
