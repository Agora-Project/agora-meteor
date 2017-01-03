/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

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
