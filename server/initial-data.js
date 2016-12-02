Meteor.startup(function() {
    var moderatorEmail, moderatorId;
    if (!Posts.findOne({$where : 'this.links.length < 1'})) {
        console.log("Adding root post");
        Posts.insert({
            title: 'Forum Root',
            links: []
        });
    }
    moderatorEmail = "moderator@example.com";
    if (!Meteor.users.findOne({
        "emails.address": moderatorEmail
    })) {
        console.log("Adding default moderator");
        moderatorId = Accounts.createUser({
            email: moderatorEmail,
            password: "mod1pass",
            username: "Moderator"
        });
        return Roles.addUsersToRoles(moderatorId, ['moderator']);
    }
});
