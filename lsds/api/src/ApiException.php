<?php
/**
 * LSDS API - lightweight exception carrying an HTTP status code.
 */

declare(strict_types=1);

namespace Lsds;

class ApiException extends \RuntimeException
{
    public int $status;

    /** @var array<string,mixed> */
    public array $details;

    /**
     * @param array<string,mixed> $details
     */
    public function __construct(string $message, int $status = 400, array $details = [])
    {
        parent::__construct($message);
        $this->status  = $status;
        $this->details = $details;
    }

    public static function notFound(string $message = 'Resource not found.'): self
    {
        return new self($message, 404);
    }

    public static function unauthorized(string $message = 'Authentication required.'): self
    {
        return new self($message, 401);
    }

    public static function forbidden(string $message = 'You do not have permission to perform this action.'): self
    {
        return new self($message, 403);
    }

    public static function validation(string $message, array $details = []): self
    {
        return new self($message, 422, $details);
    }

    public static function conflict(string $message): self
    {
        return new self($message, 409);
    }
}
