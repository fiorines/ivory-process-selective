import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Comment, FeedItem } from '../types';

const MAX_COMMENT_LENGTH = 500;

interface CommentsModalProps {
  post: FeedItem | null;
  onClose: () => void;
  /** Keeps the post's commentsCount in the feed in sync after creating a comment. */
  onCommentsCountChange: (postId: string, commentsCount: number) => void;
}

export function CommentsModal({ post, onClose, onCommentsCountChange }: CommentsModalProps) {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadComments = useCallback(async (postId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.getComments(postId);
      setComments(response.items);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (post) {
      setComments([]);
      setDraft('');
      setSubmitError(null);
      loadComments(post.id);
    }
  }, [post, loadComments]);

  const handleSubmit = async () => {
    if (!post || !token || submitting) return;

    const body = draft.trim();
    if (body.length === 0) {
      setSubmitError('Comment cannot be empty.');
      return;
    }
    if (body.length > MAX_COMMENT_LENGTH) {
      setSubmitError(`Maximum of ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await api.createComment(token, post.id, body);
      setComments((current) => [...current, response.comment]);
      setDraft('');
      onCommentsCountChange(post.id, response.commentsCount);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to send the comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={post !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments{post ? ` — ${post.id}` : ''}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeText}>Close ✕</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#60a5fa" />
                <Text style={styles.mutedText}>Loading comments…</Text>
              </View>
            )}

            {loadError && !loading && (
              <View style={styles.centerBox}>
                <Text style={styles.errorText}>{loadError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => post && loadComments(post.id)}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !loadError && (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={styles.list}
                ListEmptyComponent={
                  <Text style={styles.mutedText}>No comments yet. Be the first!</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.comment}>
                    <Text style={styles.commentAuthor}>{item.authorId}</Text>
                    <Text style={styles.commentBody}>{item.body}</Text>
                  </View>
                )}
              />
            )}

            {submitError && <Text style={styles.errorText}>{submitError}</Text>}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  setSubmitError(null);
                }}
                placeholder="Write a comment…"
                placeholderTextColor="#6b7280"
                editable={!submitting}
                maxLength={MAX_COMMENT_LENGTH + 50}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                testID="send-comment-button"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    maxHeight: '80%',
  },
  sheet: {
    backgroundColor: '#171a21',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262b36',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '700',
  },
  closeText: {
    color: '#60a5fa',
    fontSize: 14,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  list: {
    maxHeight: 320,
  },
  comment: {
    backgroundColor: '#0f1115',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262b36',
  },
  commentAuthor: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentBody: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  mutedText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f1115',
    borderWidth: 1,
    borderColor: '#262b36',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f3f4f6',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
