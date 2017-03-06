/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

MakeOverviewGraph(Template.overview, Template.overviewNode, Template.overviewPost,
    function(templateInstance, postCollection) {
        Post.find({}, {limit: 1000}).forEach(function(post) {
            postCollection.insert(post);
        });
    });
