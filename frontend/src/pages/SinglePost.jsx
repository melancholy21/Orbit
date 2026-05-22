import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Loader2, ArrowLeft } from 'lucide-react';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';

const SinglePost = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/posts/${id}`, config);
        setPost(res.data);
      } catch (err) {
        console.error('Failed to fetch post', err);
      } finally {
        setLoading(false);
      }
    };
    if (id && user) {
      fetchPost();
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-6">This post may have been deleted or is unavailable.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft size={16} /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-4 mb-2">
        <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="shrink-0">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>
      <PostCard post={post} />
    </div>
  );
};

export default SinglePost;
