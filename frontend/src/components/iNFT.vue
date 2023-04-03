<template>
  <div>
    <div>
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
        "
      >
        <!-- frontend is my passion -->
        <b-dropdown
          id="header-dropdown"
          variant="light"
          style="flex: 1; visibility: hidden"
          no-caret
          right
        >
          <template #button-content>
            <b-icon-three-dots-vertical />
          </template>
        </b-dropdown>
        <h4 style="flex: 60; text-align: center">iNFT #{{ tokenIdNumber }}</h4>
        <b-dropdown
          id="i-header-dropdown"
          toggle-class="transparent-button"
          variant="light"
          no-caret
          right
        >
          <template #button-content>
            <b-icon-three-dots-vertical />
          </template>
          <b-dropdown-item @click="showMetadataModal"
            >See metadata</b-dropdown-item
          >
          <b-dropdown-item @click="$emit('refreshMetadata', tokenId)"
            >Refresh metadata</b-dropdown-item
          >
          <b-dropdown-item v-if="!isOwned" @click="$emit('seeOwner', tokenId)"
            >See owner</b-dropdown-item
          >
          <b-dropdown-item
            v-if="isOwned"
            link-class="text-danger"
            @click="showBurnModal"
            >Burn</b-dropdown-item
          >
        </b-dropdown>
      </div>
      <!-- runs MUCH smoother on Firefox than <img> for some reason? -->
      <object style="width: 100%" :data="tokenImage"></object>
      <b-button-group v-if="isOwned" style="width: 100%">
        <template #button-content>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-arrow-repeat"
            viewBox="0 0 16 16"
          >
            <path
              d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"
            />
            <path
              fill-rule="evenodd"
              d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
            />
          </svg>
        </template>
        <b-button variant="primary" style="flex: 1" @click="showRegenModal">
          Regenerate
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-arrow-repeat"
            viewBox="0 0 16 16"
          >
            <path
              d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"
            />
            <path
              fill-rule="evenodd"
              d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
            />
          </svg>
        </b-button>
        <b-button style="flex: 1" @click="showSendModal">
          Send
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-send"
            viewBox="0 0 16 16"
          >
            <path
              d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"
            /></svg
        ></b-button>
        <!-- <b-button variant="danger" @click="showBurnModal"
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-fire"
            viewBox="0 0 16 16"
          >
            <path
              d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"
            /></svg
        ></b-button> -->
      </b-button-group>
    </div>
    <b-modal
      ref="regen-modal"
      title="Regenerate iNFT"
      ok-title="Regenerate"
      @ok="regen"
      centered
    >
      Are you sure you want to regenerate iNFT <b>#{{ this.tokenIdNumber }}</b
      >?
      <br />
      The look of an iNFT changes only once per epoch.
      <br />
      <hr />
      Select an art generator. Current one used <b>"{{ usedGenerator }}"</b>
      <b-form-select
        v-model="selectedGeneratorCopy"
        :options="generatorsSelectOptions"
        @change="selectGenerator"
      >
      </b-form-select>
    </b-modal>
    <b-modal
      ref="send-modal"
      title="Send this iNFT"
      ok-title="Send"
      @ok="send"
      :ok-disabled="addressValid !== true"
      centered
    >
      <b-form-input
        v-model="toAddress"
        placeholder="Destination address"
        :state="addressValid"
      ></b-form-input>
      <br />
      <span v-if="addressValid" style="word-break: break-all">
        Are you sure you want to send iNFT <b>#{{ this.tokenIdNumber }}</b> to
        <br />
        {{ this.toAddress }}?
        <br />
      </span>
    </b-modal>
    <b-modal
      ref="burn-modal"
      title="Burn this iNFT"
      ok-title="Burn"
      ok-variant="danger"
      @ok="burn"
      centered
    >
      Are you sure you want to burn iNFT <b>#{{ this.tokenIdNumber }}</b
      >?
      <br />
      <b>You won't be able to regenerate it, it will be gone forever.</b>
    </b-modal>
    <b-modal
      ref="metadata-modal"
      title="Metadata for an iNFT"
      ok-only
      ok-title="Close"
      ok-variant="secondary"
      size="lg"
      centered
    >
      Metadata for iNFT <b>#{{ this.tokenIdNumber }}</b>
      <br />
      <b-form-textarea
        id="metadata-textarea"
        v-model="tokenMetadata"
        readonly
        rows="20"
        wrap="soft"
      />
    </b-modal>
  </div>
</template>

<script>
import {
  BModal,
  BButtonGroup,
  BButton,
  BDropdown,
  BDropdownItem,
  BFormSelect,
  BFormInput,
  BFormTextarea,
  BIconThreeDotsVertical,
} from "bootstrap-vue";
import { Buffer } from "buffer";
import { isValidAddress } from "ethereumjs-util";

export default {
  name: "iNFT",
  props: {
    tokenId: String,
    tokenUris: Object,
    isOwned: Boolean,
    generators: Object,
    selectedGenerator: String,
  },
  data: function () {
    return {
      toAddress: "",
      tokenStorageId: `tokenUri-${this.tokenId}`,
      toggleAttrs: {},
      selectedGeneratorCopy: this.selectedGenerator,
    };
  },
  methods: {
    showRegenModal() {
      this.$refs["regen-modal"].show();
    },
    showSendModal() {
      this.$refs["send-modal"].show();
    },
    showBurnModal() {
      this.$refs["burn-modal"].show();
    },
    showMetadataModal() {
      this.$refs["metadata-modal"].show();
    },
    regen() {
      this.$emit("regenerate", { tokenId: this.tokenId });
    },
    send() {
      this.$emit("transfer", { tokenId: this.tokenId, to: this.toAddress });
      this.toAddress = "";
    },
    burn() {
      this.$emit("burn", { tokenId: this.tokenId });
    },
    selectGenerator(name) {
      this.$emit("selectGenerator", name);
    },
    validateAddress() {
      if (this.toAddress.length == 0) {
        return;
      }
      if (this.toAddress.length != 42) {
        this.$refs["send-modal"].$refs.ok.disabled = true;
        return;
      }
      if (this.toAddress.slice(0, 2) != "0x") {
        this.$refs["send-modal"].$refs.ok.disabled = true;
        return;
      }
      this.$refs["send-modal"].$refs.ok.disabled = false;
    },
  },
  computed: {
    tokenIdNumber() {
      const buf = Buffer.from(this.tokenId.slice(2), "hex");
      buf.reverse(); // why is it big endian????
      return parseInt(buf.toString("hex"), 16);
    },
    addressValid() {
      if (this.toAddress.length == 0) {
        return null;
      }
      if (this.toAddress.length != 42) {
        return false;
      }
      return isValidAddress(this.toAddress);
    },
    generatorsSelectOptions() {
      return Object.keys(this.generators).map((name) => {
        return {
          value: name,
          text: name,
        };
      });
    },
    token() {
      console.log("reloading token", this.tokenId);
      const rawToken = this.tokenUris[this.tokenId];
      if (rawToken == null) {
        return {};
      }
      return JSON.parse(this.tokenUris[this.tokenId]);
    },
    tokenImage() {
      return this.token.image;
    },
    tokenMetadata() {
      return JSON.stringify(this.token, null, 2);
    },
    usedGenerator() {
      const addr = this.token.artContract;
      // find the generator name by value
      return Object.keys(this.generators).find((name) => {
        return this.generators[name] == addr;
      });
    },
  },
  components: {
    BModal,
    BFormInput,
    BFormTextarea,
    BFormSelect,
    BButtonGroup,
    BButton,
    BDropdown,
    BDropdownItem,
    BIconThreeDotsVertical,
  },
};
</script>

<style scoped>
#metadata-textarea {
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: scroll;
}

#i-header-dropdown >>> .transparent-button {
  margin-bottom: 0.5em;
  background: 0;
  border: 0;
  border-color: 0 !important;
  background-color: 0 !important;
}
</style>
