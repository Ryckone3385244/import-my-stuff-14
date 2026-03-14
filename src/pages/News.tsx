import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Temporary type definition until Supabase types regenerate
interface BlogPost {
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

const News = () => {
  const { data: blogPosts, isLoading } = useQuery({
    queryKey: ["published-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      
      if (error) throw error;
      return (data as unknown) as BlogPost[];
    },
  });

  // Fetch SEO data from website_pages table
  const { data: pageData } = useQuery({
    queryKey: ["news-page-seo"],
    queryFn: async (): Promise<{ seo_title: string | null; seo_description: string | null } | null> => {
      const { data, error } = await (supabase
        .from("website_pages") as any)
        .select("seo_title, seo_description")
        .eq("page_url", "/news")
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
  });

  const seoTitle = pageData?.seo_title || "News & Updates";
  const seoDescription = pageData?.seo_description || "Stay updated with the latest news, announcements, and insights from {eventName}.";

  return (
    <>
      <DynamicHelmet titlePrefix={seoTitle} description={seoDescription} />

      <Navbar />
      <div className="min-h-screen pt-[calc(8rem+40px)] pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title">
              News & Updates
            </h1>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : blogPosts && blogPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post) => {
                // Extract text from HTML content for fallback
                const getExcerpt = () => {
                  if (post.excerpt) return post.excerpt;
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = post.content;
                  const textContent = tempDiv.textContent || tempDiv.innerText || '';
                  return textContent.slice(0, 250) + '...';
                };

                return (
                  <Link key={post.id} to={`/news/${post.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
                      {post.featured_image_url && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-base group-hover:text-primary transition-colors mb-3">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-4">
                          {getExcerpt()}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">No news posts available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default News;
