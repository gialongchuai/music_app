import { useState, useEffect } from "react";
import MusicPlayer, { Song } from "@/components/MusicPlayer";
import SongImporter from "@/components/SongImporter";
import { Plus } from "lucide-react";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Load songs from localStorage on mount
  useEffect(() => {
    const savedSongs = localStorage.getItem("musicPlayerSongs");
    if (savedSongs) {
      try {
        const parsedSongs = JSON.parse(savedSongs);
        setSongs(parsedSongs);
      } catch (error) {
        console.error("Error loading songs from localStorage:", error);
      }
    }
  }, []);
  const handleRemoveSong = (songId: number) => {
    const updatedSongs = songs.filter(song => song.id !== songId);
    setSongs(updatedSongs);

    // Cập nhật localStorage (tương tự handleAddSongs)
    const songsToSave = updatedSongs.map(song => ({
      ...song,
      url: song.type === "youtube" ? song.url : "[LOCAL_FILE]",
    }));
    localStorage.setItem("musicPlayerSongs", JSON.stringify(songsToSave));
  };
  const handleAddSongs = (newSongs: Song[]) => {
    const updatedSongs = [...songs, ...newSongs];
    setSongs(updatedSongs);

    // Save to localStorage (only metadata, not blob URLs for local files)
    const songsToSave = updatedSongs.map(song => ({
      ...song,
      url: song.type === "youtube" ? song.url : "[LOCAL_FILE]",
    }));
    localStorage.setItem("musicPlayerSongs", JSON.stringify(songsToSave));

    setIsImporterOpen(false);
  };

  const handleClearSongs = () => {
    setSongs([]);
    localStorage.removeItem("musicPlayerSongs");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {songs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center max-w-md w-full space-y-6">
          <div className="text-6xl">🎵</div>
          <h1 className="text-2xl font-bold text-white">
            Chào mừng đến với <br />
            Music Player
          </h1>
          <p className="text-white/60">
            Bạn chưa có bài hát nào. Hãy thêm bài hát bằng cách tải lên MP3 hoặc
            nhập URL YouTube.
          </p>
          <button
            onClick={() => setIsImporterOpen(true)}
            className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm bài hát
          </button>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex justify-between items-center mb-4 px-4 lg:px-0">
            <button
              onClick={() => setIsImporterOpen(true)}
              className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm bài hát
            </button>
            <button
              onClick={handleClearSongs}
              className="px-4 py-2 bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition text-sm"
            >
              Xóa tất cả
            </button>
          </div>
          <MusicPlayer songs={songs}  onRemoveSong={handleRemoveSong}  />
        </div>
      )}

      <SongImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onAddSongs={handleAddSongs}
      />
    </div>
  );
}
