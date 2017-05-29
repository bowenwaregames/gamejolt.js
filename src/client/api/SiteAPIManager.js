'use strict';

const axios = require('axios');
const cookie = require('cookie');

const endpoints = require('../../util/Endpoints').Endpoints;
const UserProfile = require('../../structures/site/SiteUser');
const FeaturedGame = require('../../structures/site/FeaturedGame');
const Game = require('../../structures/site/Game');
const GameOverview = require('../../structures/site/GameOverview');
const FriendRequest = require('../../structures/site/FriendRequest');
const UserFriendship = require('../../structures/site/UserFriendship');
const Notification = require('../../structures/site/Notification');

/**
 * Handles Requests to the Game Jolt site API
 * @class SiteAPIManager
 */
class SiteAPIManager {

    /**
     * Creates an instance of SiteAPIManager.
     * 
     * @param {Client} client The Game Jolt client
     *      
     * @constructor
     */
    constructor(client) {
        this.client = client;
        this._frontend = null;
        this._init();

        // Setup Axios client
        this.axios = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain',
                'Connection': 'keep-alive',
                'Cookie': '',
                'Host': 'gamejolt.com',
                'Origin': 'http://gamejolt.com',
            }
        });
    }

    /**
     * Get the frontend cookie
     * @readonly
     * 
     * @memberof SiteAPIManager
     */
    get frontend() {
        return this._frontend;
    }


    /**
     * Get the base uri for site api
     * @readonly
     * 
     * @memberof SiteAPIManager
     */
    get base() {
        return 'https://gamejolt.com/site-api';
    }

    _init() {
        this.featured = [];
        this.channels = [];
        this.paidGames = [];
        this.bestGames = [];
        this.firesidePosts = [];
        this.hotDevlogs = [];
        this.recommendedGames = [];
    }

    /**
     * Authenticate the user
     * @param {string} username Game Jolt username
     * @param {string} password Game Jolt password
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    auth(username, password) {
        const url = `${this.base}${endpoints.login}`;
        const data = { username: username, password: password };
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.post(url, data).then((response) => {
                instance._frontend = instance._getCookie(response.headers['set-cookie'], 'frontend').frontend;
                instance.axios.defaults.headers.Cookie = `frontend=${instance._frontend}`;
                resolve(response);
            })
            .catch((reject) => { });
        });
    }

    _getCookie(cookies, name) {
        for (let c in cookies) {
            let o = cookie.parse(cookies[c]);
            if (o.hasOwnProperty(name)) return o;
        }
    }

    /**
     * Logout from client as current user
     * @returns {promise}
     * 
     * @memberof SiteAPIManager
     */
    logout() {
        const url = `${this.base}${endpoints.logout}`;
        const instance = this;
        return new Promise((resolve, reject) => {
            instance.axios.post(url).then((response) => {
                resolve(response);
            })
            .catch((reject) => { });
        });
    }

    discover() {
        const url = `${this.base}${endpoints.discover}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                let data = response.data.payload;
                instance.featured = data.featured;
                instance.channels = data.channels;
                instance.paidGames = data.paidGames;
                instance.bestGames = data.bestGames;
                instance.firesidePosts = data.firesidePosts;
                instance.hotDevlogs = data.hotDevlogs;
                instance.recommendedGames = data.recommendedGames;
                resolve(response);
            })
            .catch((reject) => { });
        });
    }


    /**
     * Get all featured games on the homepage
     * @returns Promise<FeaturedGame[]>
     * 
     * @memberof SiteAPIManager
     */
    getFeatured() {
        let featuredGames = [];

        return new Promise((resolve, reject) => {
            this.discover.then((response) => {
                let featured = response.data.payload.featured;
                for (let f in featured) {
                    featuredGames.push(new FeaturedGame(this.client, featured[f]));
                }
                resolve(featured);
            });
        })
        .catch((reject) => { });
    }

    /**
     * Get the chat endpoint
     * @returns {Promise<string>}
     * 
     * @memberof SiteAPIManager
     */
    getChat() {
        const url = 'https://chat.gamejolt.com/_info';

        return new Promise((resolve, reject) => {
            axios.get(url).then(function (response) {
                resolve(`https://${response.data.host}`);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Get a user with passed username or Id
     * @param {string|number} u
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getUser(u) {
        const id = typeof u === 'number' ? u : `@${u}`;

        const url = `${this.base}${endpoints.profile(id)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                const user = new UserProfile(this.client, response.data.payload.user);
                resolve(user);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Get a game with passed game Id
     * @param {number} gameId
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getGame(gameId) {
        const url = `${this.base}${endpoints.game(gameId)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                const game = new Game(this.client, response.data.payload.game);
                resolve(game);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Get a games overview with passed game id
     * @param {number} gameId
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getGameOverview(gameId) {
        const url = `${this.base}${endpoints.game_overview(gameId)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                const overview = new GameOverview(this.client, response.data.payload);
                resolve(overview);
            })
            .catch((reject) => { });
        });
    }


    /** 
     * Get Activity Count
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getActivityCount() {
        const url = `${this.base}${endpoints.count}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                resolve(response.data.payload.notificationsCount);
            })
            .catch((reject) => { });
        });
    }


    /**
     * Get friend count
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getFriendCount() {
        const url = `${this.base}${endpoints.requestCount}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                resolve(response.data.payload.requestCount);
            })
            .catch((reject) => { });
        });
    }


    /**
     * Get all notifications
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getNotifications() {
        const url = `${this.base}${endpoints.notifications}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                const notifications = response.data.payload.items;
                const notificationList = []

                for (let notification in notifications) {
                    let newNotification = new Notification(this.client, notifications[notification]);
                    notificationList.push(newNotification);
                }
                resolve(notificationList);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Gets all friend requests
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getFriendRequests() {
        const url = `${this.base}${endpoints.requests}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                const requests = response.data.payload.requests;
                const requestList = [];

                for (let request in requests) {
                    let newRequest = new FriendRequest(this.client, requests[request]);
                    requestList.push(newRequest);
                }
                resolve(requestList);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Gets a user friendship
     * @param {string} username
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    getUserFriendship(username) {
        const url = `${this.base}${endpoints.profile(username)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                let friendship = new UserFriendship(this.client, response.data.payload.userFriendship);
                resolve(friendship);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Add a friend with passed User Id
     * @param {number} userId
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    friendAdd(userId) {
        const url = `${this.base}${endpoints.friend_add(userId)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.get(url).then((response) => {
                let data = response.data.payload;
                resolve(data);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Remove a friend
     * @param {number} id
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    friendRemove(id) {
        const url = `${this.base}${endpoints.friend_remove(id)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.post(url).then((response) => {
                let data = response.data.payload;
                resolve(data);
            })
            .catch((reject) => { });
        });
    }

    /**
     * Accept the friend request with passed id
     * @param {number} id
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    friendAccept(id) {
        const url = `${this.base}${endpoints.friend_accept(id)}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.post(url).then((response) => {
                let data = response.data.payload;
                resolve(data);
            })
            .catch((reject) => { });
        });
    }

    
    /**
     * Save profile data
     * @param {string} method
     * @param {any} data
     * @returns {Promise}
     * 
     * @memberof SiteAPIManager
     */
    save(method, data) {
        const url = `${this.base}${endpoints.save}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios({
                method: method,
                url: url,
                data: data
            })
            .then((response) => {
                let d = response.data.payload;
                resolve(d);
            })
            .catch((reject) => { });
        });
    }

    /** 
     * Change email preferences
     * @param {any} data JSON POST data
     * 
     * @memberof SiteAPIManager
     */
    emailPreferences(method, data) {
        let url = `${this.base}${endpoints.email_prefs}`;

        return new Promise((resolve, reject) => {

            if (method == 'post') url = `${url}/save`;
            
            this.axios({
                method: method,
                url: url,
                data: data
            })
            .then((response) => {
                let d = response.data.payload;
                resolve(d);
            })
            .catch((reject) => { });
        });
    }


    /**
     * Change password
     * @param {any} data JSON POST data
     * 
     * @memberof SiteAPIManager
     */
    changePassword(data) {
        const url = `${this.base}${endpoints.set_password}`;
        const instance = this;

        return new Promise((resolve, reject) => {
            instance.axios.post(url, data).then((response) => {
                let data = response.data.payload;
                resolve(data);
            }) 
            .catch((reject) => { });
        });
    }
}

module.exports = SiteAPIManager;