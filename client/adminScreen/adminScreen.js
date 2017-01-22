

Template.adminScreen.helpers({
    reports: function() {
        return Reports.find({});
    }
});

Template.adminScreen.events({
});


Template.report.helpers({
    post: function() {
        console.log(this);
        let post = Post.findOne({_id: this.targetID});
        return post;
    },
    user: function() {
        return Meteor.users.findOne(this.userID);
    }
});

Template.report.onCreated(function() {
    handlers.addHandler(this.targetID);
});

Template.report.events({

});
