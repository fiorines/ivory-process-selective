import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, ApiError } from '../api/client';
import { CommentsModal } from '../components/CommentsModal';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import type { FeedItem } from '../types';

const PAGE_SIZE = 10;

/** Concatenates pages deduplicating by id (avoids duplicates on Load more). */
function mergePosts(current: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const known = new Set(current.map((post) => post.id));
  return [...current, ...incoming.filter((post) => !known.has(post.id))];
}

export function FeedScreen() {
  const { token, user, logout } = useAuth();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [commentsPost, setCommentsPost] = useState<FeedItem | null>(null);
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setLoadError(null);
      try {
        const response = await api.getFeed(token, PAGE_SIZE, null);
        setPosts(response.items);
        setNextCursor(response.nextCursor);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load the feed.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadFirstPage('initial');
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setActionError(null);
    try {
      const response = await api.getFeed(token, PAGE_SIZE, nextCursor);
      setPosts((current) => mergePosts(current, response.items));
      setNextCursor(response.nextCursor);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to load more posts.');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor, token]);

  const applyLikeResult = useCallback((postId: string, likedByMe: boolean, likesCount: number) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, likedByMe, likesCount } : post)),
    );
  }, []);

  /** Like/unlike with optimistic update + rollback and per-post pending (no double tap). */
  const toggleLike = useCallback(
    async (post: FeedItem) => {
      if (!token || pendingLikes.has(post.id)) return;

      const previous = { likedByMe: post.likedByMe, likesCount: post.likesCount };
      const optimistic = {
        likedByMe: !post.likedByMe,
        likesCount: post.likesCount + (post.likedByMe ? -1 : 1),
      };

      setPendingLikes((current) => new Set(current).add(post.id));
      setActionError(null);
      applyLikeResult(post.id, optimistic.likedByMe, optimistic.likesCount);

      try {
        const response = post.likedByMe
          ? await api.unlikePost(token, post.id)
          : await api.likePost(token, post.id);
        // authoritative final state from the backend
        applyLikeResult(response.postId, response.likedByMe, response.likesCount);
      } catch (err) {
        // rollback of the optimistic update
        applyLikeResult(post.id, previous.likedByMe, previous.likesCount);
        setActionError(err instanceof ApiError ? err.message : 'Failed to like the post.');
      } finally {
        setPendingLikes((current) => {
          const next = new Set(current);
          next.delete(post.id);
          return next;
        });
      }
    },
    [token, pendingLikes, applyLikeResult],
  );

  const handleCommentsCountChange = useCallback((postId: string, commentsCount: number) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, commentsCount } : post)),
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mini Feed</Text>
          {user && <Text style={styles.headerSubtitle}>{user.email}</Text>}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {actionError && (
        <View style={styles.actionErrorBanner}>
          <Text style={styles.actionErrorText}>{actionError}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.mutedText}>Loading feed…</Text>
        </View>
      )}

      {loadError && !loading && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadFirstPage('initial')}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !loadError && (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              likePending={pendingLikes.has(item.id)}
              onToggleLike={toggleLike}
              onOpenComments={setCommentsPost}
            />
          )}
          contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshing={refreshing}
          onRefresh={() => loadFirstPage('refresh')}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.mutedText}>The feed is empty for now.</Text>
            </View>
          }
          ListFooterComponent={
            nextCursor ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
                testID="load-more-button"
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            ) : posts.length > 0 ? (
              <Text style={styles.mutedText}>You have reached the end of the feed.</Text>
            ) : null
          }
        />
      )}

      <CommentsModal
        post={commentsPost}
        onClose={() => setCommentsPost(null)}
        onCommentsCountChange={handleCommentsCountChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262b36',
  },
  headerTitle: {
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 12,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#262b36',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  actionErrorBanner: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionErrorText: {
    color: '#fecaca',
    fontSize: 13,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  mutedText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
