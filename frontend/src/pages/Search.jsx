import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus } from 'lucide-react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { updateFollowing } from '../features/auth/authSlice';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import toast from 'react-hot-toast';

const Search = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      if (query.trim() === '') {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const config = {
          headers: { Authorization: `Bearer ${user.token}` }
        };
        const { data } = await axios.get(`/api/users?search=${query}`, config);
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users', error);
      }
      setLoading(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, user.token]);

  const handleFollow = async (userId) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      const { data } = await axios.put(`/api/users/${userId}/follow`, {}, config);
      dispatch(updateFollowing(data.following));
      toast.success(user?.following?.includes(userId) ? 'Unfollowed!' : 'Following!');
    } catch (error) {
      toast.error('Error following user!');
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Search Users</h2>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
          <SearchIcon size={18} />
        </div>
        <Input
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 rounded-xl bg-card border-border shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {loading && <p className="text-center text-sm text-muted-foreground py-4">Searching...</p>}
        {!loading && users.length === 0 && query !== '' && (
          <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
        )}

        {users.map((u) => {
          const isFollowing = user?.following?.includes(u._id);
          return (
            <div key={u._id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={u.profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {u.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{u.username}</span>
              </div>
              <Button
                variant={isFollowing ? "default" : "outline"}
                size="sm"
                onClick={() => handleFollow(u._id)}
                className="gap-2 h-8 min-w-[100px]"
              >
                {!isFollowing && <UserPlus size={14} />}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Search;
