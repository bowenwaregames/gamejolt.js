'use strict';

const events = require('events');

const Moment = require('moment');
const Colour = require('colour');
const PrimusManager = require('./primus/PrimusManager');
const SiteAPIManager = require('./api/SiteAPIManager');
const User = require('../structures/chat/User');
const ClientUser = require('../structures/site/ClientUser');


/**
 * The Game Jolt Client.
 * @class Client
 * @extends {events.EventEmitter}
 */
class Client extends events.EventEmitter {

    /**
     * 
     * options:
     * - countInterval - Interval to request friend and notification count
     * - friendRequestInterval - Interval to accept friend requests
     * 
     * @param {any} options Client options
     * 
     * @constructor
     */
    constructor(options) {
        super();
        options = options || {};
        
        this.username = null;
        this.startTime = null;
        this.clientUser = null;
        this.activityCount = 0;
        this.friendRequests = [];
        this.notifications = [];
        this.countInterval = options.countInterval ? options.countInterval : 300;
        this.friendRequestInterval = options.friendRequestInterval ? options.friendRequestInterval : 180;
        this.api = new SiteAPIManager(this);
        this.primus = new PrimusManager(this);
        this._initTimers();
    }


    /**
     * Return the chat client
     * @readonly
     * 
     * @memberof Client
     */
    get chat() {
        return this.primus;
    }

    /**
     * Login to Game Jolt account.
     * Requires the username and password currently
     * @param {string} username Game Jolt username
     * @param {string} password Game Jolt password
     * 
     * @memberof Client
     */
    login(username, password) {
        if (username === '' || password === '') {
            throw new Error('You must pass in a valid username and password');
        }

        const instance = this;

        return new Promise((resolve) => {
            this.api.auth(username, password).then((result) => {

                if (result.data.payload.success) {
                    this.clientUser = new ClientUser(this, result.data.payload.user);
                    instance.api.getChat().then((server) => {
                        instance.initChat(server, instance.api.frontend);
                    });
                    resolve(result.data.payload);
                }
            });
        });
    }


    /**
     * Logout as the current user
     * 
     * @memberof Client
     */
    logout() {
        const instance = this;
        this.username = '';
        this.api.logout().then((result) => {
            instance.client.chat.logout();
        });
    }

    _initTimers() {
        setInterval(() => { this.fetchNotificationCount() }, this.countInterval * 1000);
        setInterval(() => { this.fetchFriendCount() }, this.countInterval * 1000);
        setInterval(() => { this.fetchFriendRequests() }, this.friendRequestInterval * 1000);
    }

    /**
     * Initialise the chat client
     * @param {string} server The chat server endpoint
     * @param {string} frontend The session cookie
     * 
     * @memberof Client
     */
    initChat(server, frontend) {
        if (server && frontend) {
            this.primus.connect(server, frontend);
        }
        else throw new Error('chat endpoint and frontend needs to be provided.');
    }

    /**
     * Fetch all notification items
     * 
     * @memberof Client
     */
    fetchNotifications() {
        this.api.getNotifications().then((notifications) => {
            if (notifications) {
                this.notifications = notifications;
                this.emit('notifications', notifications);
            }
        });
    }

    /**
     * Fetch notification count
     * 
     * @memberof Client
     */
    fetchNotificationCount() {
        this.api.getActivityCount().then((count) => {
            if (count) {
                this.activityCount = count;
                this.emit('activity-count', count);
            }
        });
    }

    /**
     * Fetch all friend requests
     * 
     * @memberof Client
     */
    fetchFriendRequests() {
        this.api.getFriendRequests().then((requests) => {
            if (requests) {
                this.friendRequests = requests;
                this.emit('friend-requests', requests);
            }
        });
    }

    /**
     * Fetch friend count
     * 
     * @memberof Client
     */
    fetchFriendCount() {
        this.api.getFriendRequests().then((requests) => {
            if (requests) {
                this.friendRequests = requests;
                this.emit('request-count', requests)
            }
        });
    }
}

module.exports = Client;