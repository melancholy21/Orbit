import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, UserPlus, Users, Loader2, UserCheck } from 'lucide-react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../features/auth/authSlice';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import toast from 'react-hot-toast';

const Search = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const suggestionsPerPage = 5;
  const totalSuggestionsPages = Math.ceil(suggestions.length / suggestionsPerPage);

  useEffect(() => {
    if (suggestionsPage > 1 && suggestionsPage > totalSuggestionsPages) {
      setSuggestionsPage(Math.max(1, totalSuggestionsPages));
    }
  }, [suggestions.length, totalSuggestionsPages, suggestionsPage]);

  // Fetch friend suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('/api/users/suggestions', config);
        setSuggestions(data);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
  }, [user.token]);

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

  const handleSendFriendRequest = async (userId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`/api/users/friends/${userId}/request`, {}, config);
      
      const updatedSent = [...(user.friendRequestsSent || []), userId];
      dispatch(updateUser({ friendRequestsSent: updatedSent }));
      
      // Remove from suggestions after sending
      setSuggestions(prev => prev.filter(u => u._id !== userId));
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAcceptFriendRequest = async (userId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/users/friends/${userId}/accept`, {}, config);
      
      const updatedReceived = (user.friendRequestsReceived || []).filter(id => id !== userId);
      const updatedFriends = [...(user.friends || []), userId];
      // Acceptance also counts as follow!
      const updatedFollowing = [...(user.following || []), userId];
      
      dispatch(updateUser({
        friendRequestsReceived: updatedReceived,
        friends: updatedFriends,
        following: updatedFollowing
      }));
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
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
          if (u._id === user._id) return null; // Don't show current user
          
          const isFriend = user?.friends?.includes(u._id);
          const hasSent = user?.friendRequestsSent?.includes(u._id);
          const hasReceived = user?.friendRequestsReceived?.includes(u._id);

          return (
            <div key={u._id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
              <div
                className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2"
                onClick={() => navigate(`/profile/${u._id}`)}
              >
                <Avatar className="shrink-0">
                  <AvatarImage src={u.profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {(u.firstName || u.lastName) ? (u.firstName ? u.firstName.charAt(0).toUpperCase() : u.lastName.charAt(0).toUpperCase()) : u.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">
                    {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
                </div>
              </div>
              
              {isFriend ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm shrink-0">
                  <UserCheck size={14} /> Friends
                </div>
              ) : hasSent ? (
                <Button
                  disabled
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 min-w-[100px] border-white/10 text-muted-foreground"
                >
                  Requested
                </Button>
              ) : hasReceived ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAcceptFriendRequest(u._id)}
                  className="gap-1.5 h-8 min-w-[100px] bg-violet-600 hover:bg-violet-500 text-white"
                >
                  Accept
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendFriendRequest(u._id)}
                  className="gap-1.5 h-8 min-w-[100px] border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  <UserPlus size={14} /> Add Friend
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Friend Suggestions Section */}
      {query === '' && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary" />
            <h3 className="text-lg font-bold">Suggested Friends</h3>
          </div>

          {suggestionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="p-6 text-center border-border/50">
              <Users size={36} className="mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No suggestions yet. Invite more people to Orbit!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {suggestions.slice((suggestionsPage - 1) * suggestionsPerPage, suggestionsPage * suggestionsPerPage).map((s) => (
                <Card key={s._id} className="flex items-center justify-between p-4 border-border/50">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => navigate(`/profile/${s._id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={s.profilePicture} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {(s.firstName || s.lastName) ? (s.firstName ? s.firstName.charAt(0).toUpperCase() : s.lastName.charAt(0).toUpperCase()) : s.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm truncate">
                        {s.firstName || s.lastName ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : s.username}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">@{s.username}</span>
                      <span className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">{s.followers?.length || 0} followers</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendFriendRequest(s._id)}
                    className="gap-2 h-8 shrink-0"
                  >
                    <UserPlus size={14} /> Add Friend
                  </Button>
                </Card>
              ))}

              {suggestions.length > suggestionsPerPage && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={suggestionsPage === 1}
                    onClick={() => setSuggestionsPage(prev => prev - 1)}
                    className="h-8"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {suggestionsPage} of {totalSuggestionsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={suggestionsPage >= totalSuggestionsPages}
                    onClick={() => setSuggestionsPage(prev => prev + 1)}
                    className="h-8"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
