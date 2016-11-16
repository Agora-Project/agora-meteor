this.Schema || (this.Schema = {});

this.Schema.Post = new SimpleSchema({
    title: {
        type: String
    },
    content: {
        type: String,
        optional: true
    },
    ownerId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    links: {
        type: [String],
        optional: true
    },
    isAttack: {
        type: Boolean,
        optional: true
    },
    respondable: {
        type: Number,
        optional: true,
        defaultValue: 0
    },
    isRoot: {
        type: Boolean,
        optional: true
    },
    createdAt: {
        type: Date,
        optional: true
    }
});

this.Post = new Mongo.Collection('posts');

this.Post.attachSchema(this.Schema.Post);

this.Post.before.insert(function(userId, post) {
    post.ownerId = userId;
    return post.createdAt = Date.now();
});

if (Meteor.isClient) {
    this.Post.after.insert(function(userId, post) {
        if (post.title < 1) return [];
        var i, len, link, ref, results, type;
        if (post.isRoot) {
            return true;
        }
        if (post.isAttack) {
            type = "Attack";
        } else {
            type = "Normal";
        }
        if (!post.links || post.links.length === 0) {
            return Meteor.call('insertLink', {
                type: type,
                sourceId: post._id,
                targetId: Post.findOne({isRoot: true})._id,
                ownerId: post.ownerId
            });
        } else {
            ref = post.links;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
                link = ref[i];
                results.push(Meteor.call('insertLink', {
                    type: type,
                    sourceId: post._id,
                    targetId: link,
                    ownerId: post.ownerId
                }));
            }
            return results;
        }
    });
}
