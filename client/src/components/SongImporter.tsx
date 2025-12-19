import { useState, useEffect, useRef } from "react";
import { Upload, Link as LinkIcon, X, Music } from "lucide-react";
import { Song } from "./MusicPlayer";
import { cn } from "@/lib/utils";

interface SongImporterProps {
  onAddSongs: (songs: Song[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SongImporter({
  onAddSongs,
  isOpen,
  onClose,
}: SongImporterProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false); // Để hiển thị loading khi fetch
  // Tạo ref cho input YouTube URL
  const youtubeInputRef = useRef<HTMLInputElement>(null);

  // Focus vào input khi modal mở
  useEffect(() => {
    if (isOpen && youtubeInputRef.current) {
      // Đợi một chút để modal render xong (đặc biệt khi có animation)
      const timer = setTimeout(() => {
        youtubeInputRef.current?.focus();
        // Optional: chọn toàn bộ text nếu có sẵn (rất tiện nếu user muốn paste lại)
        youtubeInputRef.current?.select();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Effect để tự động fetch metadata khi URL thay đổi và hợp lệ
  useEffect(() => {
    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return;
    }

    const fetchMetadata = async () => {
      setIsFetchingMetadata(true);
      setError("");

      try {
        const response = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`
        );
        if (!response.ok) throw new Error("Không thể lấy thông tin video");

        const data = await response.json();

        if (data.title) {
          // Thường title có dạng "Tên bài hát - Nghệ sĩ" hoặc "Tên bài hát"
          setSongTitle(data.title);

          // Nếu có author_name thì ưu tiên dùng làm artist, nếu không thì thử tách từ title
          if (data.author_name) {
            setArtistName(data.author_name);
          } else {
            // Tách artist từ title (phổ biến là sau dấu gạch ngang cuối cùng)
            const parts = data.title.split(" - ");
            if (parts.length > 1) {
              setArtistName(parts[parts.length - 1].trim());
            }
          }
        }
      } catch (err) {
        setError(
          "Không thể lấy tự động tên bài hát/nghệ sĩ. Bạn có thể nhập thủ công."
        );
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    fetchMetadata();
  }, [youtubeUrl]); // Chạy lại mỗi khi youtubeUrl thay đổi

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const mp3Files = files.filter(
      file => file.type === "audio/mpeg" || file.name.endsWith(".mp3")
    );

    if (mp3Files.length !== files.length) {
      setError("Chỉ chấp nhận file MP3");
      return;
    }

    setUploadedFiles([...uploadedFiles, ...mp3Files]);
    setError("");
  };

  const handleAddYoutubeUrl = () => {
    if (!youtubeUrl.trim()) {
      setError("Vui lòng nhập URL YouTube");
      return;
    }

    if (!songTitle.trim() || !artistName.trim()) {
      setError("Vui lòng nhập tên bài hát và nghệ sĩ");
      return;
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      setError("URL YouTube không hợp lệ");
      return;
    }

    // Create a YouTube song object
    const newSong: Song = {
      id: Date.now(),
      title: songTitle,
      artist: artistName,
      cover: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      url: `https://www.youtube.com/embed/${youtubeId}`,
      duration: "0:00",
      type: "youtube",
      youtubeId: youtubeId,
    };

    onAddSongs([newSong]);
    setYoutubeUrl("");
    setSongTitle("");
    setArtistName("");
    setError("");
  };

  // --- PHẦN THAY ĐỔI CHÍNH LÀ ĐÂY ---
  const handleProcessFiles = async () => {
    if (uploadedFiles.length === 0) {
      setError("Vui lòng chọn file MP3");
      return;
    }

    setIsLoading(true);
    const newSongs: Song[] = [];

    for (const file of uploadedFiles) {
      const url = URL.createObjectURL(file);
      const audio = new Audio();

      await new Promise(resolve => {
        audio.onloadedmetadata = () => {
          const duration = Math.floor(audio.duration);
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

          newSongs.push({
            id: Date.now() + Math.random(),
            title: file.name.replace(/\.mp3$/i, ""),
            artist: "Unknown Artist",
            cover: "/images/album1.jpg", // Đảm bảo bạn có ảnh này hoặc đổi thành placeholder
            url: url,
            duration: durationStr,
            type: "local",
            file: file, // <--- QUAN TRỌNG: Gửi file gốc về Home để lưu vào DB
          });
          resolve(null);
        };
        audio.src = url;
      });
    }

    onAddSongs(newSongs);
    setUploadedFiles([]);
    setIsLoading(false);
    setError("");
  };
  // ----------------------------------

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ... header */}

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {/* YouTube URL Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Nhập YouTube URL
            </h3>
            <div className="space-y-3">
              {/* Thêm ref vào input này */}
              <input
                ref={youtubeInputRef}
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {/* Các input khác giữ nguyên */}
              <input
                type="text"
                placeholder="Tên bài hát (tự động điền nếu có)"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                disabled={isFetchingMetadata}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
              />

              <input
                type="text"
                placeholder="Tên nghệ sĩ (tự động điền nếu có)"
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
                disabled={isFetchingMetadata}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
              />

              {isFetchingMetadata && (
                <p className="text-sm text-white/60">
                  Đang lấy thông tin tự động...
                </p>
              )}

              <button
                onClick={handleAddYoutubeUrl}
                disabled={isFetchingMetadata}
                className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition disabled:opacity-70"
              >
                Thêm từ YouTube
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5" />
              Tải lên MP3
            </h3>

            {/* File Upload Area */}
            <label className="block">
              <input
                type="file"
                multiple
                accept=".mp3,audio/mpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition">
                <Music className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white font-medium">
                  Kéo thả file MP3 hoặc nhấp để chọn
                </p>
                <p className="text-white/50 text-sm mt-1">
                  Hỗ trợ nhiều file cùng lúc
                </p>
              </div>
            </label>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-white/60">
                  Đã chọn {uploadedFiles.length} file
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/10"
                    >
                      <span className="text-white text-sm truncate">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-white/10 rounded transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={handleProcessFiles}
              disabled={uploadedFiles.length === 0 || isLoading}
              className={cn(
                "w-full mt-4 px-4 py-3 font-semibold rounded-xl transition",
                uploadedFiles.length > 0 && !isLoading
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-white/10 text-white/50 cursor-not-allowed"
              )}
            >
              {isLoading
                ? "Đang xử lý..."
                : `Thêm ${uploadedFiles.length} file`}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
