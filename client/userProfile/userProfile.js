/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.userProfile.helpers({
    user: function() {
        return Meteor.users.findOne({_id: this.id});
    }
});

Template.userProfile.onCreated(function() {
    this.subscribe('user', this.data.id);
})
