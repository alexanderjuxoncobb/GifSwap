interface GifGridProps {
  onGifSelect: (gifUrl: string) => void;
  selectedGifs: string[];
}

interface Media {
  id: string;
  url: string;
  title: string;
  isAnimated: boolean;
  type: "gif" | "image";
}

const POPULAR_MEDIA: Media[] = [
  {
    id: "side-eye-chloe",
    url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHZhN2xtZGRtZ3ZsNmhqdHl3amF1b24yM2RyOGpwMG1xaHYxZnVnZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kaq6GnxDlJaBq/giphy.gif",
    title: "Side Eye Chloe",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "s239QJIh56sRW",
    url: "https://media.giphy.com/media/s239QJIh56sRW/giphy.gif",
    title: "GIF 1",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "bWM2eWYfN3r20",
    url: "https://media.giphy.com/media/bWM2eWYfN3r20/giphy.gif",
    title: "GIF 3",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "coffee-cup-meme",
    url: "https://media.giphy.com/media/6pJNYBYSMFod2/giphy.gif",
    title: "Coffee Cup Meme",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "white-guy-blink",
    url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    title: "White Guy Blink",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "watermelon",
    url: "https://media.giphy.com/media/13n7XeyIXEIrbG/giphy.gif",
    title: "Watermelon",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "think-hmm",
    url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif",
    title: "Think Hmm",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "shaq-shimmy",
    url: "https://media.giphy.com/media/UO5elnTqo4vSg/giphy.gif",
    title: "Shaq Shimmy",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "xL7PDV9frcudO",
    url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDZ0cWJvNzk1cmEwMmhwNzdmdDhkdnNob2FqYjVhcTU0YTMzejEweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xL7PDV9frcudO/giphy.gif",
    title: "Confused Math Lady",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "cF7QqO5DYdft6",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTVyMXV1aGJ2OXp6Z2hhbmNsYnh0dnB5NmJndGU0NWJrMHl4NzQ5ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cF7QqO5DYdft6/giphy.gif",
    title: "Homer Simpson Backing Into Bushes",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "11ISwbgCxEzMyY",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExamt1YmpiNzgzbG53eGhrZ3FnaTZycnY2cWs1ZTM0cnczZHVoM20wcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11ISwbgCxEzMyY/giphy.gif",
    title: "Shaq Shaking Head",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "GpsHIJ4IBN7sn28ieH",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnplaHczMW5obms0NDI1ZXJ2dWx1Yml4NmprNWlremhvazU5amRxdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GpsHIJ4IBN7sn28ieH/giphy.gif",
    title: "Dog Reaction GIF",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "BPJmthQ3YRwD6QqcVD",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRkY204OGhsNHdyYjAyazdrbGw3aXFkNnMyZGRrYW11OXFkd2lxNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BPJmthQ3YRwD6QqcVD/giphy.gif",
    title: "Surprised Pikachu",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "cXblnKXr2BQOaYnTni",
    url: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzE0Z280N2NweWNqcTg4a3k2bnF1bDYxcGQxODN6cnNkZWkyNnoweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cXblnKXr2BQOaYnTni/giphy.gif",
    title: "Crying Cat Thumbs Up",
    isAnimated: true,
    type: "gif",
  },
  {
    id: "CycIvRahkUp0Y",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjV3azJ3YzZyM282YXc5eXo5eDR2NXJheW44dHdwMzViaGFodG1payZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CycIvRahkUp0Y/giphy.gif",
    title: "Success Kid",
    isAnimated: true,
    type: "gif",
  },
];

export default function GifGrid({ onGifSelect, selectedGifs }: GifGridProps) {
  console.log("GifGrid rendering with media:", POPULAR_MEDIA);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "16px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {POPULAR_MEDIA.map((media) => (
        <div
          key={media.id}
          onClick={() => onGifSelect(media.url)}
          style={{
            position: "relative",
            cursor: "pointer",
            border: selectedGifs.includes(media.url)
              ? "3px solid #3b82f6"
              : "2px solid #ccc",
            borderRadius: "8px",
            backgroundColor: selectedGifs.includes(media.url)
              ? "#eff6ff"
              : "white",
            transform: selectedGifs.includes(media.url)
              ? "scale(0.95)"
              : "scale(1)",
            transition: "all 0.2s ease",
          }}
        >
          <img
            src={media.url}
            alt={media.title}
            style={{
              width: "100%",
              height: "160px",
              objectFit: "cover",
              display: "block",
              borderRadius: "6px",
            }}
            onLoad={() => {
              console.log(`Image loaded successfully: ${media.title}`);
            }}
            onError={(e) => {
              console.error(`Failed to load image: ${media.url}`);
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNGRkZGRkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD4KPC9zdmc+";
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              backgroundColor: media.type === "gif" ? "#3b82f6" : "#8b5cf6",
              color: "white",
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            {media.type === "gif" ? "GIF" : "IMG"}
          </div>
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              backgroundColor: selectedGifs.includes(media.url)
                ? "#10b981"
                : "rgba(255, 255, 255, 0.9)",
              color: selectedGifs.includes(media.url) ? "white" : "#374151",
              fontSize: "14px",
              padding: "6px",
              borderRadius: "4px",
              border:
                "2px solid " +
                (selectedGifs.includes(media.url) ? "#10b981" : "#d1d5db"),
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
          >
            {selectedGifs.includes(media.url) ? "✓" : "□"}
          </div>
        </div>
      ))}
    </div>
  );
}
