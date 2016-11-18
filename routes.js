Router.onBeforeAction(function() {
    if (Meteor.user() && Meteor.user().isBanned) {
        return this.render('forbidden');
    } else {
        return this.next();
    }
});

Router.route('/forum', {
    name: 'forumIndex',
    template: 'forumIndex'
});

Router.route('/forum/post/:_id', function () {
    var routerThis = this;
    var id = this.params._id;
    handlers.addHandler(id, {
        onReady: function() {
            routerThis.render('expandedPost', {
                data: Post.findOne({_id: id})
            });
        }
    });
});

Router.route('/forum/users', {
    name: 'forumUsers',
    template: 'forumUsers'
});
