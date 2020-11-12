(ns codeserver.core
  (:gen-class)
  (:require [org.httpkit.server :as server]
            [clojure.data.json :as json]))

(def code-groups (atom {}))
(def channel-map (atom {}))

(defn now [] (new java.util.Date))

(defn notify-join
  "Notifies a channel that a user has joined the same group"
  [codename codegroup channel]
  (if (not (= codename (first ((deref channel-map) channel))))
      (server/send! channel (json/write-str {:event "user_joined"
                                         :data {:codename codename
                                                :codegroup codegroup}}))))

(defn notify-leave
  "Notifies a channel that a user has left the same group"
  [codename codegroup channel]
  (if (not (= codename (first ((deref channel-map) channel))))
      (server/send! channel (json/write-str {:event "user_left"
                                         :data {:codename codename
                                                :codegroup codegroup}}))))

(defn get-codenames
  [codegroup]
  (defn get-names-helper
    [group]
    (if (empty? group)
      '()
      (cons (first (first group)) (get-names-helper (rest group)))))
  (get-names-helper (deref (first ((deref code-groups) codegroup)))))

(defn notify-delta
  "Notifies a channel of a user's code delta"
  [codename delta channel]
  (if (not (= (first ((deref channel-map) channel)) codename))
    (server/send! channel (json/write-str {:event "code_delta"
                                         :data {:codename codename
                                                :delta delta}}))))

(defn notify-chat-message
  "Notifies a channel of a user's chat message"
  [codename message channel]
  (if (not (= (first ((deref channel-map) channel)) codename))
    (server/send! channel (json/write-str {:event "chat_message"
                                         :data {:codename codename
                                                :message message}}))))

(defn notify-typing-status
  "Notifies a channel of a user's typing status"
  [codename status channel]
  (if (not (= (first ((deref channel-map) channel)) codename))
    (server/send! channel (json/write-str {:event "typing_status"
                                         :data {:codename codename
                                                :status status}}))))

(defn notify-lang-change
  "Notifies a channel a change in language"
  [codename lang channel]
  (if (not (= (first ((deref channel-map) channel)) codename))
    (server/send! channel (json/write-str {:event "lang_change"
                                           :data {:codename codename
                                                  :lang lang}}))))

(defn notify-group
  "Applies a notification function to each channel in the group"
  [codegroup notify]
  (loop [group (deref (first ((deref code-groups) codegroup)))]
    (if (not (empty? group))
      (do (notify (second (first group)))
          (recur (rest group))))))

(defn acknowledge
  "Acknowledges a client at the other end of the channel for a particular event."
  [event-type channel]
  (server/send! channel (json/write-str {:event "ack"
                                         :data {:ack_event
                                                event-type}})))

(defn add-to-group
  [codename channel codegroup]
  (if (first ((deref code-groups) codegroup))
          (swap! (first ((deref code-groups) codegroup)) assoc codename channel)
          (swap! code-groups assoc codegroup [(atom {codename channel}) (atom [])])))

(defn send-heartbeat
  [channel]
  (server/send! channel (json/write-str {:event "heartbeat"
                                         :data {:num_groups
                                                (count (deref code-groups))
                                                :num_users
                                                (count (deref channel-map))}})))

(defn handle-join-group
  "Either joins a user with an existing group or creates a new one."
  [data channel]
  (let [codename (data "codename")
        codegroup (data "codegroup")
        group-atom (first ((deref code-groups) codegroup))]
    (cond (and group-atom ((deref group-atom) codename))
          (server/send! channel (json/write-str {:event "join_group_response"
                                                 :data {:status "codename_taken"}}))
          (and group-atom (>= (count (deref group-atom)) 16))
          (server/send! channel (json/write-str {:event "join_group_response"
                                                 :data {:status "codegroup_full"}}))
          (or (clojure.string/blank? codename) (> (count codename) 24))
          (server/send! channel (json/write-str {:event "join_group_response"
                                                 :data {:status "codename_invalid"}}))
          (or (clojure.string/blank? codegroup) (> (count codegroup) 24))
          (server/send! channel (json/write-str {:event "join_group_response"
                                                 :data {:status "codegroup_invalid"}}))
          :else (do (swap! channel-map assoc channel [codename codegroup])
                    (add-to-group codename channel codegroup)
                    (notify-group codegroup #(notify-join codename codegroup %1))
                    (server/send! channel (json/write-str {:event "join_group_response"
                                                           :data {:status "ok"
                                                                  :users (get-codenames codegroup)
                                                                  :deltas (deref (second ((deref code-groups) codegroup)))}}))
                    (spit "event.log" (str (now) ": " channel " joined " codegroup " as " codename "\n") :append true)))))

(defn handle-code-delta
  [data channel]
  (let [codename (data "codename")
        codegroup (second ((deref channel-map) channel))
        delta (data "delta")]
    (do (swap! (second ((deref code-groups) codegroup)) conj delta)
        (notify-group codegroup #(notify-delta codename delta %))
        (acknowledge "delta" channel))))

(defn handle-group-info-request
  [data channel]
  (let [codegroup (data "codegroup")
        num_coders (if (nil? (first ((deref code-groups) codegroup)))
                     0
                     (count (deref (first ((deref code-groups) codegroup)))))]
    (server/send! channel (json/write-str {:event "group_info"
                                           :data {:num_coders num_coders}}))))

(defn handle-chat-message
  [data channel]
  (let [codename (data "codename")
        codegroup (second ((deref channel-map) channel))
        message (data "message")]
    (notify-group codegroup #(notify-chat-message codename message %))))

(defn handle-close
  [status channel]
  (let [user-info ((deref channel-map) channel)]
    (if (not (nil? user-info))
      (let [codename (first user-info)
            codegroup (second user-info)
            group-map (deref (first ((deref code-groups) codegroup)))]
        (do (if (and (= (count group-map) 1) (not (nil? (group-map codename))))
              (swap! code-groups dissoc codegroup)
              (do (notify-group codegroup #(notify-leave codename codegroup %1))
                  (swap! (first ((deref code-groups) codegroup)) dissoc codename)))
            (swap! channel-map dissoc channel))))))

(defn handle-typing-status
  [data channel]
  (let [codename (data "codename")
        codegroup (second ((deref channel-map) channel))
        status (data "status")]
    (notify-group codegroup #(notify-typing-status codename status %))))

(defn handle-lang-change
  [data channel]
  (let [codename (data "codename")
        codegroup (second ((deref channel-map) channel))
        lang (data "lang")]
    (notify-group codegroup #(notify-lang-change codename lang %))))

(defn handle-event
  "Receives an event as a JSON string and sends to the corresponding handler."
  [event channel]
  (let [event-obj (json/read-str event)
        event-type (event-obj "event")
        event-data (event-obj "data")]
    (cond (= event-type "join_group") (handle-join-group event-data channel)
          (= event-type "heartbeat") (send-heartbeat channel)
          (= event-type "code_delta") (handle-code-delta event-data channel)
          (= event-type "group_info") (handle-group-info-request event-data channel)
          (= event-type "chat_message") (handle-chat-message event-data channel)
          (= event-type "typing_status") (handle-typing-status event-data channel)
          (= event-type "lang_change") (handle-lang-change event-data channel)
          :else (println "unknown event received"))))

(defn ws-handler
  "Handles websocket communication of open channels with clients."
  [request]
  (server/with-channel request channel
    (server/on-close channel #(handle-close %1 channel))
    (server/on-receive channel #(handle-event %1 channel))))

(defn -main
  []
  (server/run-server ws-handler {:port 8081}))
