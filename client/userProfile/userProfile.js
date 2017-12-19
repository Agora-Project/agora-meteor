/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Template.userProfile.helpers({
    user: function() {
        return Meteor.users.findOne({_id: this.id});
    },
    editing: function() {
        return Template.instance().editing.get();;
    },
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    },
    ownProfile: function() {
        return Meteor.userId() == this.id;
    },
    bio: function() {
        let rawBio = Meteor.users.findOne({_id: this.id}).bio;
        if (rawBio) {
            return XBBCODE.process({
                text: rawBio,
                removeMisalignedTags: false,
                addInLineBreaks: true
            }).html;
        }
    }
});

Template.userProfile.onCreated(function() {
    this.subscribe('user', this.data.id);

    this.editing = new ReactiveVar(false);
    this.errorMessage = new ReactiveVar();
});

Template.userProfile.events({
    "click #profile-bio-edit": function() {
        Template.instance().editing.set(true);
    },
    'keydown, keyup': function(event) {
        event.stopImmediatePropagation();

        if (Template.instance().editing.get() && event.ctrlKey && event.key == "Enter") {
            let instance = Template.instance();
            Meteor.call("updateUserBio", $('#profile-bio-textarea').val(), function(error) {
                if (error) {
                    //Display error message to user.
                    instance.errorMessage.set(error.reason);
                }
                else {
                    //Don't delete user's work unless it posts successfully.
                    instance.editing.set(false);
                }
            });
        }

    },
    "click #profile-bio-submit-button": function() {
        let instance = Template.instance();
        Meteor.call("updateUserBio", $('#profile-bio-textarea').val(), function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.editing.set(false);
            }
        });
    },
    "click #profile-bio-cancel-button": function() {
        $('#profile-bio-textarea').val(this.bio);
        Template.instance().editing.set(false);
    }
});
