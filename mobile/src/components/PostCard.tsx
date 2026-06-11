import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FeedItem } from '../types';

interface PostCardProps {
  post: FeedItem;
  likePending: boolean;
  onToggleLike: (post: FeedItem) => void;
  onOpenComments: (post: FeedItem) => void;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function PostCard({ post, likePending, onToggleLike, onOpenComments }: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.author}>{post.authorId}</Text>
        <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
      </View>

      <Text style={styles.body}>{post.body}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, post.likedByMe && styles.likedButton]}
          onPress={() => onToggleLike(post)}
          disabled={likePending}
          testID={`like-button-${post.id}`}
        >
          {likePending ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <Text style={[styles.actionText, post.likedByMe && styles.likedText]}>
              {post.likedByMe ? '♥' : '♡'} {post.likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => onOpenComments(post)}>
          <Text style={styles.actionText}>💬 {post.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#171a21',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262b36',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 14,
  },
  date: {
    color: '#6b7280',
    fontSize: 12,
  },
  body: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#0f1115',
    borderWidth: 1,
    borderColor: '#262b36',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  likedButton: {
    borderColor: '#f87171',
  },
  actionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  likedText: {
    color: '#f87171',
  },
});
