app.vue:
<template>
  <div class="app" :class="{ 'green-theme': isGreenTheme }">
    <h1>Secret Notes</h1>

    <!-- Encryption Container -->
    <div class="encrypt-container">
      <h2>Encrypt Note</h2>
      <form @submit.prevent="createNote">
        <div>
          <label for="note-content">Note Content:</label>
          <textarea
            id="note-content"
            v-model="newNote.content"
            placeholder="Enter your secret note..."
            required
          ></textarea>
        </div>

        <div>
          <label for="encryption-key">Encryption Key:</label>
          <input
            id="encryption-key"
            type="password"
            v-model="newNote.key"
            placeholder="Enter encryption key..."
            required
          />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Encrypting...' : 'Encrypt Note' }}
        </button>
      </form>

      <div v-if="createMessage" :class="['message', createMessage.includes('successfully') ? 'success' : 'error']">
        {{ createMessage }}
      </div>
    </div>

    <!-- Decryption Container -->
    <div class="decrypt-container">
      <h2>Decrypt Note</h2>

      <div v-if="notes.length === 0" class="no-notes">
        No notes available. Create a note first.
      </div>

      <div v-else>
        <div v-for="note in notes" :key="note.id" class="note-item">
          <h3>Note #{{ note.id }} - {{ new Date(note.created_at).toLocaleString() }}</h3>

          <div v-if="!note.decrypted" class="decrypt-form">
            <input
              type="password"
              v-model="note.decryptKey"
              placeholder="Enter decryption key..."
              @keyup.enter="decryptNote(note)"
            />
            <button @click="decryptNote(note)" :disabled="loading" class="btn-secondary">
              Decrypt
            </button>
          </div>

          <div v-else class="note-content">
            <p><strong>Decrypted Content:</strong> {{ note.content }}</p>
            <button @click="hideNote(note)" class="btn-secondary">Hide Content</button>
          </div>

          <div v-if="note.error" class="error">
            {{ note.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import posthog from './posthog';

export default {
  name: 'SecretNotesApp',
  data() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    loading: false,
    newNote: {
      content: '',
      key: '',
      user_id: urlParams.get('user_id') || ''
    },
    notes: [],
    createMessage: null,
    isGreenTheme: false,
  };
},

  mounted() {
    // Set initial state
    this.isGreenTheme = posthog.isFeatureEnabled('green_theme');

    // Listen for feature flag updates 
    posthog.onFeatureFlags(() => {
      this.isGreenTheme = posthog.isFeatureEnabled('green_theme');
    });

    this.fetchNotes();
  },

  methods: {
    async createNote() {
      if (!this.newNote.content.trim() || !this.newNote.key.trim()) {
        this.createMessage = 'Please fill in all fields';
        return;
      }

      this.loading = true;
      this.createMessage = null;

      try {
        const noteContentLength = this.newNote.content.length; // save before clearing

        // Only include user_id if present
        const body = {
          content: this.newNote.content,
          key: this.newNote.key
        };
        if (this.newNote.user_id) {
          body.user_id = this.newNote.user_id;
        }

        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
          this.createMessage = "Note encrypted successfully!";
          this.newNote.content = '';
          this.newNote.key = '';

          this.$posthog.capture('note_encrypted', {
            length: noteContentLength
          });

          await this.fetchNotes();
        } else {
          this.createMessage = data.error || 'Failed to create note';
        }
      } catch (error) {
        console.error('Failed to create note:', error);
        note.error = 'Network error. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    async fetchNotes() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        let url = '/api/notes';
        if (userId) {
          url += `?user_id=${userId}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
          this.notes = data.notes.map(note => ({
            ...note,
            decrypted: false,
            decryptKey: '',
            content: '',
            error: null
          }));
        } else {
          console.error('Error fetching notes:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch note:', error);
        note.error = 'Network error. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    async decryptNote(note) {
      if (!note.decryptKey.trim()) {
        note.error = 'Please enter a decryption key';
        return;
      }

      this.loading = true;
      note.error = null;

      try {
        const response = await fetch(`/api/notes/${note.id}/decrypt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: note.decryptKey })
        });

        const data = await response.json();

        if (response.ok) {
          note.content = data.content;
          note.decrypted = true;
          note.decryptKey = '';

          this.$posthog.capture('note_decrypted', {
            note_id: note.id
          });
        } else {
          note.error = data.error || 'Failed to decrypt note';
        }
      } catch (error) {
        console.error('Failed to decrypt note:', error);
        note.error = 'Network error. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    hideNote(note) {
      note.decrypted = false;
      note.content = '';
      note.decryptKey = '';
      note.error = null;
    }
  }
};
</script>


<style>
@import './css/app.css';
</style>