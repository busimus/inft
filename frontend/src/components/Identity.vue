<template>
  <div class="">
    <div v-if="!signedIn" class="identity">
      <div class="avatar-wrapper">
        <img src="../assets/signedOut.png" class="avatar rounded" />
      </div>
      <button
        style="width: 100%"
        class="btn btn-primary"
        v-on:click="$emit('signIn')"
      >
        Sign in
      </button>
    </div>
    <div v-else class="identity">
      <div class="avatar-wrapper">
        <img
          :src="'https://robohash.org/' + identity.address"
          class="avatar rounded"
        />
      </div>
      <div class="text-truncate">
        <div>
          {{ identity.state }}
          <br />
          <div class="address text-truncate">
            {{ identity.address }}
          </div>
        </div>
      </div>
      <button class="btn btn-outline-danger" @click.stop="$emit('signOut')">
        <b-icon-x />
      </button>
    </div>
  </div>
</template>

<script>
import { BIconX } from "bootstrap-vue";

export default {
  name: "Identity",
  components: {
    BIconX,
  },
  props: {
    identity: Object,
  },
  data: () => {
    return {};
  },
  methods: {},
  computed: {
    signedIn() {
      return this.identity != null && this.identity.address != null;
    },
  },
};
</script>

<style scoped>
.identity {
  height: 5rem;
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
}

.avatar-wrapper {
  height: 75px;
  width: 75px;
  margin-right: 1rem;
}

.avatar {
  height: 100%;
  width: 5rem;
  background-color: #eee;
}

.address {
  color: grey;
}

.conn-btn {
  height: 3rem;
}

.load-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: auto;
}
</style>
