import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Profile, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, MessageSquare, ArrowLeft, Search } from 'lucide-react';

type ConversationWithDetails = {
  id: string;
  created_at: string;
  updated_at: string;
  otherUser: Profile;
  lastMessage?: Message;
};

type Props = {
  initialUserId?: string | null;
  onClearInitial: () => void;
};

export default function MessagesPage({ initialUserId, onClearInitial }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const loadConversations = useCallback(async () => {
    if (!user) return;

    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participantRows?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participantRows.map(r => r.conversation_id);

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles(*)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const { data: convRows } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    const convList: ConversationWithDetails[] = (convRows || []).map(conv => {
      const participant = (allParticipants || []).find(p => p.conversation_id === conv.id);
      const last = (lastMessages || []).find(m => m.conversation_id === conv.id);
      return {
        ...conv,
        otherUser: (participant?.profiles as unknown as Profile) || null,
        lastMessage: last || undefined,
      };
    }).filter(c => c.otherUser);

    setConversations(convList);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle initialUserId (open or create conversation)
  useEffect(() => {
    if (!initialUserId || !user) return;

    (async () => {
      // Check if conversation already exists
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myConvs?.length) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', initialUserId)
          .in('conversation_id', myConvs.map(r => r.conversation_id));

        if (shared?.length) {
          setSelectedConvId(shared[0].conversation_id);
          setMobileView('chat');
          onClearInitial();
          return;
        }
      }

      // Create new conversation
      const { data: conv } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (conv) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: initialUserId },
        ]);
        await loadConversations();
        setSelectedConvId(conv.id);
        setMobileView('chat');
      }
      onClearInitial();
    })();
  }, [initialUserId, user, loadConversations, onClearInitial]);

  useEffect(() => {
    if (!selectedConvId) return;
    loadMessages(selectedConvId);

    const sub = supabase
      .channel(`messages:${selectedConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConvId}`,
      }, () => {
        loadMessages(selectedConvId);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(*)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as (Message & { sender: Profile })[]);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedConvId || !user) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    await supabase.from('messages').insert({
      conversation_id: selectedConvId,
      sender_id: user.id,
      content,
    });
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConvId);
    await loadConversations();
    setSending(false);
  }

  function selectConversation(convId: string) {
    setSelectedConvId(convId);
    setMobileView('chat');
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const filteredConvs = conversations.filter(c =>
    !search || c.otherUser?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0">
      <div className="mb-6 md:hidden">
        {mobileView === 'chat' && selectedConv ? (
          <button
            onClick={() => setMobileView('list')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Messages</span>
          </button>
        ) : (
          <h1 className="text-2xl font-bold text-white">Messages</h1>
        )}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-800 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white mb-3 hidden md:block">Messages</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <div className="w-28 h-3 bg-gray-800 rounded" />
                        <div className="w-full h-3 bg-gray-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare size={28} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                  <p className="text-gray-600 text-xs mt-1">Connect with people and start messaging</p>
                </div>
              ) : (
                filteredConvs.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800 transition-colors text-left border-b border-gray-800/50 ${selectedConvId === conv.id ? 'bg-gray-800 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {conv.otherUser?.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-400 font-semibold text-sm">
                          {conv.otherUser?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-semibold truncate">{conv.otherUser?.full_name}</span>
                        {conv.lastMessage && (
                          <span className="text-gray-600 text-xs flex-shrink-0 ml-2">{timeAgo(conv.lastMessage.created_at)}</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs truncate mt-0.5">
                        {conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {!selectedConvId || !selectedConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={40} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-gray-600 text-sm mt-1">Choose from your connections to start chatting</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden">
                    {selectedConv.otherUser?.avatar_url ? (
                      <img src={selectedConv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-400 font-semibold text-sm">
                        {selectedConv.otherUser?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{selectedConv.otherUser?.full_name}</div>
                    <div className="text-gray-500 text-xs">
                      {selectedConv.otherUser?.role && selectedConv.otherUser?.company
                        ? `${selectedConv.otherUser.role} at ${selectedConv.otherUser.company}`
                        : `@${selectedConv.otherUser?.username}`}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">No messages yet</p>
                        <p className="text-gray-600 text-xs mt-1">Say hello!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMe && (
                            <div className={`w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                              {msg.sender?.avatar_url ? (
                                <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-blue-400 font-semibold text-xs">
                                  {msg.sender?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-gray-800 text-gray-200 rounded-bl-md'
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-gray-600 text-xs px-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-4 border-t border-gray-800 bg-gray-900">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!newMsg.trim() || sending}
                    className="w-11 h-11 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
