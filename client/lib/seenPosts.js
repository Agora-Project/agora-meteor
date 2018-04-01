/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

postIsSeen = function (post) {
    let user = Meteor.users.findOne({_id: Meteor.userId()});

    //if theres no user logged in all posts are seen.
    if (!user) return true;

    //if this post was posted by the logged in user then it is automatically seen.
    if (post.poster == Meteor.userId()) return true;

    //if the post was posted 30 days or more ago, it is automatically seen.
    if (!post.postedOn || Date.now() - post.postedOn >= (1000*60*60*24*30)) return true;

    //if this post is listed in the users log of seen posts, then it has been seen.
    if (user.seenPosts && user.seenPosts.find(function(postID) {
        return postID == post._id;
    })) {
        return true;
    }

    return false;
}
