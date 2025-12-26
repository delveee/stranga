class MatchingEngine {
    constructor() {
        this.waitingQueue = []; // [{ socketId, interests: [], filters: {} }]
        this.activePairs = new Map(); // socketId -> partnerSocketId
    }

    addUser(socketId, interests = [], filters = {}) {
        // Remove if already exists to avoid duplicates
        this.removeUser(socketId);

        const user = { socketId, interests, filters, joinedAt: Date.now() };

        // Try to find a match immediately
        const match = this.findMatch(user);

        if (match) {
            return match;
        } else {
            this.waitingQueue.push(user);
            return null;
        }
    }

    removeUser(socketId) {
        this.waitingQueue = this.waitingQueue.filter(u => u.socketId !== socketId);
        const partnerId = this.activePairs.get(socketId);
        if (partnerId) {
            this.activePairs.delete(socketId);
            this.activePairs.delete(partnerId);
            return partnerId; // Return partner ID to notify them
        }
        return null;
    }

    findMatch(newUser) {
        // 1. Try Interest Match
        for (let i = 0; i < this.waitingQueue.length; i++) {
            const potentialMatch = this.waitingQueue[i];

            // Skip if self
            if (potentialMatch.socketId === newUser.socketId) continue;

            // Check mutual interests
            const commonInterests = newUser.interests.filter(tag =>
                potentialMatch.interests.includes(tag)
            );

            if (commonInterests.length > 0) {
                // Match found!
                this.waitingQueue.splice(i, 1); // Remove from queue
                this.activePairs.set(newUser.socketId, potentialMatch.socketId);
                this.activePairs.set(potentialMatch.socketId, newUser.socketId);
                return { partnerId: potentialMatch.socketId, commonInterests };
            }
        }

        // 2. Fallback to Random Match (if allowed by filters - simpler version for now)
        // For now, if no interest match, just pick the longest waiting user
        if (this.waitingQueue.length > 0) {
            const match = this.waitingQueue.shift();
            this.activePairs.set(newUser.socketId, match.socketId);
            this.activePairs.set(match.socketId, newUser.socketId);
            return { partnerId: match.socketId, commonInterests: [] };
        }

        return null;
    }
}

module.exports = new MatchingEngine();
