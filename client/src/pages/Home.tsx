// app/page.tsx (hoặc Home.tsx)
import { useState, useEffect } from "react";
import MusicPlayer, { Song } from "@/components/MusicPlayer";
import SongImporter from "@/components/SongImporter";
import { Plus } from "lucide-react";

// --- HELPERS CHO INDEXED DB ---
const DB_NAME = "MusicPlayerDB";
const STORE_NAME = "audioFiles";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event) => reject(event);
  });
};

const saveAudioFile = async (id: number, file: Blob) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(file, id);
};

const getAudioFile = async (id: number): Promise<Blob | undefined> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
};

const deleteAudioFile = async (id: number) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
};
// ------------------------------

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Load songs from localStorage AND IndexedDB on mount
  useEffect(() => {
    const loadSongs = async () => {
      const savedSongs = localStorage.getItem("musicPlayerSongs");
      if (savedSongs) {
        try {
          const parsedSongs: Song[] = JSON.parse(savedSongs);
          
          // Duyệt qua các bài hát, nếu là bài local thì load blob từ DB và tạo URL mới
          const restoredSongs = await Promise.all(
            parsedSongs.map(async (song) => {
              if (song.type === "local") {
                const blob = await getAudioFile(song.id);
                if (blob) {
                  const newUrl = URL.createObjectURL(blob);
                  return { ...song, url: newUrl };
                }
              }
              return song;
            })
          );
          setSongs(restoredSongs);
        } catch (error) {
          console.error("Error loading songs:", error);
        }
      }
    };
    loadSongs();
  }, []);

  const handleRemoveSong = (songId: number) => {
    const updatedSongs = songs.filter((song) => song.id !== songId);
    setSongs(updatedSongs);

    // Xóa file khỏi IndexedDB để giải phóng bộ nhớ
    deleteAudioFile(songId);

    // Cập nhật localStorage
    const songsToSave = updatedSongs.map((song) => {
      const { file, ...rest } = song; // Không lưu object File vào localStorage
      return {
        ...rest,
        url: song.type === "youtube" ? song.url : "[LOCAL_FILE]",
      };
    });
    localStorage.setItem("musicPlayerSongs", JSON.stringify(songsToSave));
  };

  const handleAddSongs = (newSongs: Song[]) => {
    // 1. Lưu file MP3 vào IndexedDB
    newSongs.forEach((song) => {
      if (song.type === "local" && song.file) {
        saveAudioFile(song.id, song.file);
      }
    });

    const updatedSongs = [...songs, ...newSongs];
    setSongs(updatedSongs);

    // 2. Lưu metadata vào localStorage (bỏ qua property 'file')
    const songsToSave = updatedSongs.map((song) => {
      const { file, ...rest } = song; // Loại bỏ file blob object khi lưu JSON
      return {
        ...rest,
        url: song.type === "youtube" ? song.url : "[LOCAL_FILE]",
      };
    });
    localStorage.setItem("musicPlayerSongs", JSON.stringify(songsToSave));

    setIsImporterOpen(false);
  };

  const handleClearSongs = async () => {
    setSongs([]);
    localStorage.removeItem("musicPlayerSongs");
    
    // Clear toàn bộ DB
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
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
          <MusicPlayer songs={songs} onRemoveSong={handleRemoveSong} />
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