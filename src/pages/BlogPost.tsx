import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import { ArrowLeft, Calendar, Clock, Facebook, Linkedin, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { sanitizeHtml } from "@/lib/utils";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";

// Temporary type definition until Supabase types regenerate
interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_id: string | null;
  status: string;
  published_at: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

interface AdjacentPost {
  slug: string;
  title: string;
}

const BlogPost = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const { replacePlaceholders, eventName } = useEventSettingsContext();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      
      if (error) throw error;
      return data as BlogPostData | null;
    },
  });

  const { data: adjacentPosts } = useQuery<{ previous: AdjacentPost | null; next: AdjacentPost | null }>({
    queryKey: ["adjacent-posts", post?.published_at],
    enabled: !!post?.published_at,
    queryFn: async () => {
      if (!post?.published_at) return { previous: null, next: null };

      const { data: previousPost } = await supabase
        .from("blog_posts")
        .select("slug, title")
        .eq("status", "published")
        .lt("published_at", post.published_at)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: nextPost } = await supabase
        .from("blog_posts")
        .select("slug, title")
        .eq("status", "published")
        .gt("published_at", post.published_at)
        .order("published_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return { 
        previous: previousPost as AdjacentPost | null, 
        next: nextPost as AdjacentPost | null 
      };
    },
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = post?.title || "";

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Article link has been copied to clipboard",
      });
      return;
    }

    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-page">
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-48 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-page">
          <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
            <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
            <Link to="/news" className="text-primary hover:underline">
              ← Back to News
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const readingTime = Math.ceil(post.content.split(" ").length / 200);
  
  // Replace placeholders in content before sanitizing and rendering
  const normalizedContent = sanitizeHtml(
    replacePlaceholders(post.content)
      .replace(/<h1\b/gi, "<h3")
      .replace(/<\/h1>/gi, "</h3>")
      .replace(/<h2\b/gi, "<h3")
      .replace(/<\/h2>/gi, "</h3>")
  );

  return (
    <>
      <DynamicHelmet
        customTitle={replacePlaceholders(post.seo_title || `${post.title} | ${eventName}`)}
        description={replacePlaceholders(post.seo_description || post.excerpt || "")}
        ogImage={post.featured_image_url || undefined}
        ogType="article"
        articlePublishedTime={post.published_at || undefined}
        articleModifiedTime={post.updated_at}
      />
      <JsonLdSchema
        type={["Article", "BreadcrumbList"]}
        articleData={{
          headline: post.title,
          description: post.seo_description || post.excerpt || undefined,
          image: post.featured_image_url || undefined,
          datePublished: post.published_at || undefined,
          dateModified: post.updated_at,
          author: eventName,
        }}
        breadcrumbs={[{ name: "News", url: "/news" }, { name: post.title }]}
      />

      <Navbar />
      <div className="min-h-screen bg-background pt-page">
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          {post.featured_image_url && (
            <div className="w-full h-[320px] md:h-[400px] relative mb-8 rounded-lg overflow-hidden border border-border">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <Link 
            to="/news" 
            className="inline-flex items-center text-primary hover:underline mb-8 group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to News
          </Link>

          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.published_at}>
                    {format(new Date(post.published_at), "MMMM d, yyyy")}
                  </time>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min read</span>
              </div>
            </div>

          </header>

          {post.excerpt && (
            <div className="text-xl text-muted-foreground mb-8 pb-8 border-b">
              {post.excerpt}
            </div>
          )}

          <div 
            className="prose md:prose-lg max-w-none [&>h1:first-child]:hidden [&>h2:first-child]:hidden prose-headings:text-foreground prose-headings:leading-[1.2em] [&_h1]:text-[length:var(--h1-size,2.25rem)] [&_h2]:text-[length:var(--h2-size,1.875rem)] [&_h3]:text-[length:var(--h3-size,1.5rem)] [&_h4]:text-[length:var(--h4-size,1.25rem)] [&_h5]:text-[length:var(--h5-size,1.125rem)] [&_h6]:text-[length:var(--h6-size,1rem)] prose-p:text-foreground prose-p:mb-10 prose-strong:text-foreground prose-a:text-primary prose-ul:text-foreground prose-ol:text-foreground"
            dangerouslySetInnerHTML={{ __html: normalizedContent }}
          />

          {/* Social Share Buttons */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Share this article</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare("facebook")}
                className="gap-2"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare("twitter")}
                className="gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare("linkedin")}
                className="gap-2"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare("copy")}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </div>

          {/* Previous/Next Navigation */}
          {adjacentPosts && (adjacentPosts.previous || adjacentPosts.next) && (
            <div className="mt-8 pt-8 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              {adjacentPosts.previous ? (
                <Link
                  to={`/news/${adjacentPosts.previous.slug}`}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary transition-colors group"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground group-hover:text-white/80 mb-1">Previous Article</div>
                    <div className="font-medium text-sm line-clamp-2 group-hover:text-white transition-colors">
                      {adjacentPosts.previous.title}
                    </div>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {adjacentPosts.next ? (
                <Link
                  to={`/news/${adjacentPosts.next.slug}`}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary transition-colors group md:text-right"
                >
                  <div className="flex-1 md:order-1">
                    <div className="text-xs text-muted-foreground group-hover:text-white/80 mb-1">Next Article</div>
                    <div className="font-medium text-sm line-clamp-2 group-hover:text-white transition-colors">
                      {adjacentPosts.next.title}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors md:order-2" />
                </Link>
              ) : null}
            </div>
          )}
        </article>
      </div>
      <Footer />
    </>
  );
};

export default BlogPost;
